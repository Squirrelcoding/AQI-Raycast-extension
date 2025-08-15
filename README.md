# Townmood

A Raycast project to determine how a place is feeling by using sentiment analysis on local news. Also provides more specific locations if possible.

## How it works

Whenever a user enters in the name of a US city, the response gets put into a Google search API to search for the city's subreddit. If none appears than the closest big city's name will be fetched (this is why the city has to be in the US - there is a database) using the PostGIS in Postgres (this feature is still being worked on)! And if the city is already in the cache, the results from the cache will be used.

After that, the `snoowrap` package (a Reddit API wrapper) fetches the 10 hottest posts along with 5 comments from each one, for a total of 10 post titles and 50 comments. This data is fed into the Google Gemma API which analyzes everything and creates the mood and headlines. The results are stored in the cache!

## Features

### Get the summary

Run `get-mood` with the name of the location to get the current general mood of a town. It also provides some headlines!

### Browse cache

Run `get-cache` to get the cache from Supabase!

## Installation instructions

First create a new empty extension using the Raycast `Create Extension` tool, and then navigate to the folder of the extension, remove all the contents, and clone the repository in there.

Next is the tricky part: getting all of the API keys. We're going to need the following:

- Reddit API keys, and a Reddit account's credentials to fetch all the posts.
	- After creating a Reddit account, navigate to the [apps](https://old.reddit.com/prefs/apps) page and create a new app. The redirect URL doesn't matter. Click the "script" option. After this you should be able to see your client ID and secret.
- Supabase API keys to create the cache.
	- Create a [Supabase account](https://supabase.com/dashboard/sign-in?returnTo=%2Forg), create a new database, and navigate to the settings. Click on the "Data API" tab and copy the URL. To get the secret key, click on "API Keys" (right below the "Data API" tab) and copy the `anon public` key.
	- In the `Table Editor` tab, upload `cities_rows.csv` and rename it to `cities`.
	- Go to the `Extensions` tab and enable the `PostGIS` extension.
	- Run `create_idx.sql` in the SQL editor.
	- Run `find_function.sql` in the SQL editor.
	- Run `schema_access.sql` in the SQL editor.
- Google Gemma API keys for the LLM.
	- Go to Google's [AI Studio](https://aistudio.google.com/prompts/new_chat) and click on the "Get API Key" on the top right. You should see another button called "Create API Key" - click on it and copy the generated key.
- Serp API keys to be able to scrape Google search results to get the subreddit name.
	- Create an account on [SerpAPI](https://serpapi.com/) and navigate to the dashboard. You should see your private API key on the bottom.

After collecting all of the API keys, run the `get-mood` command with any US city name. Enter all of the appropriate keys in there and you're done!