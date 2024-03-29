# earthwiggle-scraper
Scrapes earthquake data from the [Philippine Institute of Volcanology and Seismology website](https://www.phivolcs.dost.gov.ph/).
Data is cached to a local SQLite database and is exposed as a simple public API. New events trigger a notification to [Slack](https://slack.com/) and [Discord](https://discordapp.com/).

## Related Repos
- [earthwiggle-web](https://github.com/earthwiggle/earthwiggle-web): Front-end code for [earthwiggle.com](https://earthwiggle.com)

## Slack Webhook Example
![slack-webhook](etc/slack-webhook.png)

## Discord Webhook Example
![discord-webhook](etc/discord-webhook.png)
