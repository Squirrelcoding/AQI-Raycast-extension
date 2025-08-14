import { Detail, LaunchProps, getPreferenceValues, AI } from "@raycast/api";
import { off } from "process";
import { useEffect, useState } from "react";
import snoowrap from "snoowrap";

const preferences = getPreferenceValues<Preferences>();
console.log(preferences);

const r = new snoowrap({
	userAgent: "town-mood-raycast-extension",
	clientId: preferences.client_id,
	clientSecret: preferences.client_secret,
	username: preferences.reddit_username,
	password: preferences.reddit_password,
});


const cx = "33bdcbccb457145c7";

export async function getSubreddits(query: string) {
	const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${preferences.google_api_key}&cx=${cx}&q=${encodeURIComponent(query)}&num=1`);
	console.log("Got google result.");
	const data = await res.json();
	console.log("Got google result!!!!");
	const items = data.items || [];
	if (items.length === 0) {
		// TODO: Implement logic for getting biggest nearby city with a subreddit
		console.log("no response found :(")
		console.log(data);
		return null;
	}
	const topLink = items[0].link;
	console.log("Got link");
	if (!topLink.startsWith("https://www.reddit.com/r/")) {
		return null;
	}
	const u = new URL(topLink);
	const match = u.pathname.match(/^\/r\/([^\/]+)/);
	if (match) {
		console.log("Returning link...");
		return match[1];
	}
	return null;
}

export async function getSubredditContent(name: string) {
	console.log("Getting subreddit contents...")
	const posts = await r.getSubreddit(name).getHot({ limit: 1 });
	console.log("Got subreddit contents. Constructing output...")
	const result = [];
	for (const post of posts) {
		const withComments = await post.expandReplies({ limit: 5, depth: 1 });
		const commentContent = withComments.comments.map(comment => comment.body);
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

	const [data, setData] = useState<any>(null);

	useEffect(() => {
		if (!location) return;

		(async () => {

			// Begin searching for 
			console.log(1);
			const subredditName = await getSubreddits(location);

			if (subredditName) {
				const results = await getSubredditContent(subredditName);
				const prompt = `
				Your task is to evaluate the following reddit comments. Categorize them into at most three topics from a city's subreddit, and come up with a final "mood" of the city.\n
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
				console.log("Asking AI...")
				const aiResponse = await AI.ask(prompt);
				console.log("Response recieved!")
				setData(aiResponse);
			}

		})();
	});

	return <>
		{data && <Detail markdown={data} />}
	</>;
}
