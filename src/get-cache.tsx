import { List, getPreferenceValues } from "@raycast/api";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const preferences = getPreferenceValues<Preferences>();

const supabaseUrl = preferences.supabase_url;
const supabaseKey = preferences.supabase_key;
const supabase = createClient(supabaseUrl, supabaseKey);


async function getAllCachedMoods() {
	try {
		const { data, error } = await supabase
			.from("townmood cache")
			.select("*")
			.order("created_at", { ascending: false })
			.limit(100); // Limit to most recent 100 entries

		if (error) {
			console.error("Error fetching cached moods:", error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error("Error in getAllCachedMoods:", error);
		return [];
	}
}

function getHeadlines(mood): string[] {
	return [mood.headline1, mood.headline2, mood.headline3]
		.filter((h): h is string => h !== null && h.trim().length > 0);
}

export default function BrowseCachedMoods() {
	const [cachedMoods, setCachedMoods] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			const moods = await getAllCachedMoods();
			setCachedMoods(moods);
			setLoading(false);
		})();
	}, []);

	if (loading) {
		return <List isLoading={true} />;
	}

	if (cachedMoods.length === 0) {
		return (
			<List>
				<List.EmptyView
					title="No Cached Data"
					description="No town moods cached yet"
				/>
			</List>
		);
	}

	return (
		<List
			navigationTitle="Cached Town Moods"
			searchBarPlaceholder="Search cities..."
			isShowingDetail={true} // This ensures detail view is always shown
		>
			{cachedMoods.map((mood) => {
				const headlines = getHeadlines(mood);
				const subtitle = headlines.length > 0
					? `${mood.mood} • ${headlines[0]}`
					: mood.mood;

				return (
					<List.Item
						key={mood.id}
						title={`r/${mood.subreddit}`}
						subtitle={subtitle}
						accessories={[
							{ text: `${headlines.length} headlines` }
						]}
						detail={
							<List.Item.Detail
								markdown={`# ${mood.mood}\n\n**r/${mood.subreddit}**\n\n${headlines.length > 0
										? headlines.map(h => `• ${h}`).join('\n\n')
										: '*No headlines available*'
									}`}
							/>
						}
					/>
				);
			})}
		</List>
	);
}
