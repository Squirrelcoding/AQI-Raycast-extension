import { LaunchProps, getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";
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
	const res = await fetch(`https://www.googleapis.com/customsearch/v1&key=${preferences.google_api_key}&cx=${cx}&query=${encodeURIComponent(query)}&num=1`);
	console.log(await res.json());
}


export async function getSubredditContent(name: string) {
	const posts = await r.getSubreddit(name).getHot({limit: 5});
	const result = [];
	for (const post of posts) {
		const withComments = await post.expandReplies({ limit: 5, depth: 1 });
		const commentContent = withComments.comments.map(comment => comment.body);
		result.push({
			postTitle: post.title,
			comments: commentContent
		});
	}
	return result;
}

export default function MyCommand(props: LaunchProps<{ arguments: Arguments.GetAqi }>) {
	const location = props.arguments.location.toLowerCase().replace(",", "").replace(" ", "+");
	
	
	useEffect(() => {
		console.log("HERE");
		if (!location) return;

		(async () => {
			// Begin searching for 
			
			getSubreddits(location);

		})();
	}, [location]);

	return <></>;
}
