import { Detail, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import snoowrap from "snoowrap";
import { getJson } from "serpapi";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";


const preferences = getPreferenceValues<Preferences>();
console.log(preferences);

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
	apiKey: preferences.google_genai_api_key,
});

async function askAI(query: string) {
	const response = await ai.models.generateContent({
		model: "gemma-3-27b-it",
		contents: query,
	});
	return response.text || "NO RESPONSE";
}

async function getNearestMajorCity(city: string, state: string | null) {
	if (state) {
		const s = `${city} ${state}`;
		const { data: cityData } = await supabase
			.from("cities")
			.select("*")
			.ilike("place", `%${s}%`) // case-insensitive partial match
			.limit(1);

		const lat = cityData.lat;
		const lon = cityData.lng;

		const { data } = await supabase.rpc('get_nearest_big_city', {
			current_lat: lat,
			current_lon: lon,
			radius_meters: 100000
		});
		console.log(data);
	}
}

/// Uses the Raycast AI API and PostGIS to deduce a new city to pick.
async function fixQuery(query: string) {
	console.log("No response found. Getting nearest big city...")
	const nameSuggestion = await askAI(`A user in an app entered this city name as a location within the US, but no major subreddit was found for it. If no state was provided, return ONE single word that could be what the user could have been referring to. If a state is included, return in the format "place, state". If it is nonsense, return "NONE" - do NOT include any explanations in any of the answers. Just the raw text. This the input: ${query}.`);
	if (nameSuggestion !== "NONE") {
		return await getSubreddits(nameSuggestion);
	}
	if (nameSuggestion.includes(",")) {
		const p = nameSuggestion.split(",");
		const place = p[0];
		const state = p[1];
		// 
		return await getNearestMajorCity(place, state);
	}
	return null;
}

async function getSubreddits(query: string) {
	const data = await getJson({ engine: "google", api_key: preferences.serp_api_key, q: `${query} subreddit` });

	console.log("Got google result.");
	console.log("Got google result!!!!");
	const items = data["organic_results"] || [];
	if (items.length === 0) {
		return await getSubreddits(await fixQuery(query));
	}
	const topLink = items[0].link;
	console.log("Got link");
	if (!topLink.startsWith("https://www.reddit.com/r/")) {
		console.log("No response found. Getting nearest big city...")
		const nameSuggestion = await askAI(`A user in an app entered this as a location, but no major subredd it was found for it. If no state was provided, return ONE single word that could be what the user could have been referring to. If a state is included, return in the format "place, state". If it is nonsense, return "NONE"`);
		if (nameSuggestion !== "NONE") {
			return await getSubreddits(nameSuggestion);
		}
		return null;
	}
	const u = new URL(topLink);
	const match = u.pathname.match(/^https:\/\/(www\.)?reddit\.com\/r\/[A-Za-z0-9_]+\/?$/);
	if (match) {
		console.log("Returning link...");
		return match[1];
	}
	return await getSubreddits(await fixQuery(query));
}

async function getSubredditContent(name: string) {
	console.log("Getting subreddit contents...")
	const posts = await r.getSubreddit(name).getHot({ limit: 10 });
	console.log("Got subreddit contents. Constructing output...")
	const result = [];
	for (const post of posts) {
		const withComments = await post.expandReplies({ limit: 5, depth: 1 });
		const commentContent = withComments.comments.map(comment => comment.body);
		console.log(commentContent)
		result.push({
			postTitle: post.title,
			comments: commentContent
		});
	}
	console.log("Returning output...")
	return result;
}

export default function MyCommand(props: LaunchProps<{ arguments: Arguments.GetMood }>) {
	const location = props.arguments.location.toLowerCase().replace(",", "").replace(" ", "+");

	const [headlines, setHeadlines] = useState<string[] | null>(null);
	const [mood, setMood] = useState<string | null>(null);

	useEffect(() => {
		if (!location) return;

		(async () => {

			// Begin searching for 
			console.log(1);
			const subredditName = await getSubreddits(location);

			if (subredditName) {
				const results = await getSubredditContent(subredditName);
				const prompt = `
				Your task is to evaluate the following reddit comments. Categorize them into at most three topics from a city's subreddit, and come up with a final "mood" of the city. In this case, the subreddit is r/${subredditName}. Please output four bullet points. The first one will consist of ONLY one word describing the overall mood, with an appropriate emoji before the word. The next three bullet points should describe the top headlines. Do not incldue extra descriptive text like "Mood: Happy" or "Headlines," only the raw answers are required. \n
				${results.map(post => {
					let result = ``;
					result += `# ${post.postTitle}\n`;
					for (const comment in post.comments) {
						result += `- ${comment}\n`;
					}
					result += "\n";
					return result;
				})}
				`;

				const aiResponse = await askAI(prompt);

				const rawLines = aiResponse.split("\n");
				const lines = rawLines.map(line => line.replace("-", "").trim());
				setMood(lines[0]);
				setHeadlines([lines[1], lines[2], lines[3]]);
				console.log(lines);
			}
		})();
	}, []);

	return <>
		{mood && (
			<Detail
				markdown={`# Mood: ${mood}\n\n${headlines!.map(h => `- ${h}`).join("\n")}`}
			/>
		)}
	</>;
}
