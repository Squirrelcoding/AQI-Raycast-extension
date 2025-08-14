import { Detail, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import snoowrap from "snoowrap";
import { getJson } from "serpapi";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const preferences = getPreferenceValues<Preferences>();

const supabaseUrl = preferences.supabase_url;
const supabaseKey = preferences.supabase_key;
const supabase = createClient(supabaseUrl, supabaseKey);

const r = new snoowrap({
	userAgent: "town-mood-raycast-extension",
	clientId: preferences.client_id,
	clientSecret: preferences.client_secret,
	username: preferences.reddit_username,
	password: preferences.reddit_password,
});

const ai = new GoogleGenAI({
	apiKey: preferences.gemma_api_key,
});

async function askAI(query: string) {
	const response = await ai.models.generateContent({
		model: "gemma-3-27b-it",
		contents: query,
	});
	return response.text || "NO RESPONSE";
}

async function getNearestMajorCity(city: string, state: string | null = null): Promise<string | null> {
	try {
		const searchQuery = state ? `${city} ${state}` : city;
		console.log(`Searching for nearest major city to: ${searchQuery}`);

		const { data: cityData, error: cityError } = await supabase
			.from("cities")
			.select("*")
			.ilike("place", `%${searchQuery}%`)
			.limit(1);

		if (cityError || !cityData || cityData.length === 0) {
			console.log("No city found in database");
			return null;
		}

		const lat = cityData[0].lat;
		const lon = cityData[0].lng;

		console.log(`Found coordinates: ${lat}, ${lon}`);

		const { data: nearestCity, error: nearestError } = await supabase.rpc('get_nearest_big_city', {
			current_lat: lat,
			current_lon: lon,
			radius_meters: 100000
		});

		if (nearestError || !nearestCity || nearestCity.length === 0) {
			console.log("No nearest big city found");
			return null;
		}

		console.log("Found nearest major city:", nearestCity[0]);
		return nearestCity[0].place || nearestCity[0].name; // Adjust based on your DB schema
	} catch (error) {
		console.error("Error finding nearest major city:", error);
		return null;
	}
}

async function fixQuery(query: string): Promise<string | null> {
	console.log("No response found. Attempting to fix query...");
	try {
		const nameSuggestion = await askAI(`A user in an app entered this city name as a location within the US, but no major subreddit was found for it. If no state was provided, return ONE single word that could be what the user could have been referring to. If a state is included, return in the format "place, state". If it is nonsense, return "NONE" - do NOT include any explanations in any of the answers. Just the raw text. This is the input: ${query}.`);

		console.log("AI suggestion:", nameSuggestion);

		if (nameSuggestion.trim() === "NONE") {
			return null;
		}

		// Check if the suggestion includes a state
		if (nameSuggestion.includes(",")) {
			const parts = nameSuggestion.split(",").map(p => p.trim());
			const place = parts[0];
			const state = parts[1];

			// First try to get subreddit for the suggested location
			const subredditResult = await getSubreddits(nameSuggestion, false); // Don't recurse
			if (subredditResult) {
				return subredditResult;
			}

			// If no subreddit found, try nearest major city
			const nearestCity = await getNearestMajorCity(place, state);
			if (nearestCity) {
				return await getSubreddits(nearestCity, false);
			}
		} else {
			// Single word suggestion - try it directly first
			const subredditResult = await getSubreddits(nameSuggestion, false);
			if (subredditResult) {
				return subredditResult;
			}

			// Then try nearest major city
			const nearestCity = await getNearestMajorCity(nameSuggestion);
			if (nearestCity) {
				return await getSubreddits(nearestCity, false);
			}
		}

		return null;
	} catch (error) {
		console.error("Error in fixQuery:", error);
		return null;
	}
}

async function getSubreddits(query: string, allowFallback: boolean = true): Promise<string | null> {
	try {
		console.log(`Searching for subreddit: ${query}`);
		const data = await getJson({
			engine: "google",
			api_key: preferences.serp_api_key,
			q: `${query} subreddit site:reddit.com`
		});

		console.log("Got Google search results");
		const items = data["organic_results"] || [];

		if (items.length === 0) {
			console.log("No search results found");
			if (allowFallback) {
				return await fixQuery(query);
			}
			return null;
		}

		for (const item of items) {
			const link = item.link;
			console.log("Checking link:", link);

			if (link && link.startsWith("https://www.reddit.com/r/")) {
				const u = new URL(link);
				// Fixed regex - was checking against full URL but should check pathname
				const match = u.pathname.match(/^\/r\/([A-Za-z0-9_]+)\/?$/);
				if (match) {
					const subredditName = match[1];
					console.log("Found subreddit:", subredditName);

					// Verify the subreddit exists and is accessible
					try {
						await r.getSubreddit(subredditName).fetch();
						return subredditName;
					} catch (error) {
						console.log(`Subreddit ${subredditName} not accessible, trying next result`);
						continue;
					}
				}
			}
		}

		console.log("No valid Reddit links found in results");
		if (allowFallback) {
			return await fixQuery(query);
		}
		return null;
	} catch (error) {
		console.error("Error in getSubreddits:", error);
		if (allowFallback) {
			return await fixQuery(query);
		}
		return null;
	}
}

async function getSubredditContent(name: string) {
	console.log("Getting subreddit contents...");
	try {
		const posts = await r.getSubreddit(name).getHot({ limit: 10 });
		console.log("Got subreddit contents. Constructing output...");
		const result = [];

		for (const post of posts) {
			try {
				const withComments = await post.expandReplies({ limit: 5, depth: 1 });
				const commentContent = withComments.comments
					.map(comment => comment.body)
					.filter(body => body && body.length > 0); // Filter out empty comments

				result.push({
					postTitle: post.title,
					comments: commentContent
				});
			} catch (error) {
				console.error("Error expanding post comments:", error);
				// Continue with just the post title
				result.push({
					postTitle: post.title,
					comments: []
				});
			}
		}

		console.log("Returning subreddit content...");
		return result;
	} catch (error) {
		console.error("Error getting subreddit content:", error);
		throw error;
	}
}

export default function MyCommand(props: LaunchProps<{ arguments: Arguments.GetMood }>) {
	const location = props.arguments.location.toLowerCase().replace(/[,\s]+/g, " ").trim();

	const [headlines, setHeadlines] = useState<string[] | null>(null);
	const [mood, setMood] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!location) {
			setLoading(false);
			return;
		}

		(async () => {
			try {
				console.log("Starting search for location:", location);
				const subredditName = await getSubreddits(location);

				if (subredditName) {
					console.log("Found subreddit:", subredditName);
					const results = await getSubredditContent(subredditName);

					const prompt = `
Your task is to evaluate the following reddit posts and comments from r/${subredditName}. Categorize them into at most three topics from this city's subreddit, and come up with a final "mood" of the city. Please output exactly four bullet points. The first bullet point should contain ONLY one word describing the overall mood, with an appropriate emoji before the word. The next three bullet points should describe the top headlines/topics. Do not include extra descriptive text like "Mood:" or "Headlines:" - only the raw answers are required.

${results.map(post => {
						let result = `# ${post.postTitle}\n`;
						post.comments.forEach(comment => {
							if (comment && comment.length > 0) {
								result += `- ${comment}\n`;
							}
						});
						result += "\n";
						return result;
					}).join("")}
`;

					const aiResponse = await askAI(prompt);
					console.log("AI Response:", aiResponse);

					const rawLines = aiResponse.split("\n").filter(line => line.trim().length > 0);
					const lines = rawLines.map(line => line.replace(/^[-•]\s*/, "").trim());

					if (lines.length >= 4) {
						setMood(lines[0]);
						setHeadlines([lines[1], lines[2], lines[3]]);
					} else {
						// Fallback if AI doesn't return expected format
						setMood(lines[0] || "😐 Unknown");
						const remainingLines = lines.slice(1);
						while (remainingLines.length < 3) {
							remainingLines.push("No additional information available");
						}
						setHeadlines(remainingLines.slice(0, 3));
					}
				} else {
					setError("No subreddit found for this location. Try a larger city or different spelling.");
				}
			} catch (err) {
				console.error("Error in main function:", err);
				setError("An error occurred while fetching data. Please try again.");
			} finally {
				setLoading(false);
			}
		})();
	}, [location]);

	if (loading) {
		return <Detail markdown={` Loading...\n\nSearching for city mood...`} />;
	}

	if (error) {
		return <Detail markdown={`# Error\n\n${error}`} />;
	}

	if (mood && headlines) {
		return (
			<Detail
				markdown={`# Mood: ${mood}\n\n## Top Topics:\n${headlines.map(h => `- ${h}`).join("\n")}`}
			/>
		);
	}

	return <Detail markdown="# No Data \n No mood data available for this location." />;
}