a dumb-simple countdown card for subreddits. visually similar cards to prothesmia's discord embeds.

what it does
- a simple countdown for a set event: a ring, few optional fields, a live d:h:m:s clock if you want one
- if you set a start date, the ring fills gradually from the start date through % elapsed
- an optional scheduled thread, with the days left in the title - pins under the countdown post
- the countdown post self-pins in the first slot

setup
- any mod with `everything` privileges can add it to their community
- in the subreddit's mod menu, select `create countdown post`
- set custom config through the community's installed apps' settings - post updates accordingly

settings
- events: `name | event date | countdown start`, separated by `;`. the start is optional, for example `JEE Main 2027 Session 1 | 2027-01-20 00:00 | 2026-11-01 00:00`
- timezone: an IANA name, `Asia/Kolkata` by default
- ring styles: default / pride / trans
- card size: tall by default, or compact. desktop is for wide screens - avoid it if most of your members use the phone client
- fields: target, time left, elapsed - deselect all for just the ring
- tag: small text in the top corner, `none` to hide
- live clock: days, hours, minutes and seconds under a smaller ring
- countdown post title: used when a mod creates the post
- scheduled thread: on or off, the hour, a title and a text. placeholders: `{days}` `{event}` `{date}`

mod menu
- create countdown post
- post scheduled thread now

permissions
- the app runs as its own account. reddit adds that account to your community as a moderator with full permissions
- it uses that to post the countdown, post the scheduled thread and pin them
- it keeps two small values in reddit's own app storage: the date of the last scheduled thread and that thread's post id
- it stores nothing about the people who view or comment on its posts

notes
- the card size is fixed when a post is made. change it, then make a new post
- the app posts and pins as its own account, which gets mod permissions in your community
- without the pin permission the posts still go up, just unpinned

run locally
```
npm install
npm run login
npm run dev
```
`npm run dev` playtests on a subreddit you moderate. `npm run deploy` uploads a version, `npm run launch` sends it for review.

checks
```
npm run check
npm test
npm run build
```

changelog
- 0.0.10 - minimized footer
- 0.0.7 - add `"marketingAssets": { "icon": "assets/icon.png" }`
- 0.0.6 - approved for the public listing
- 0.0.5 - first version on reddit

links
- site: [prothesmia.xyz](https://prothesmia.xyz)
- source: [github.com/nielandvoid/prothesmia](https://github.com/nielandvoid/prothesmia)
- [terms](https://prothesmia.xyz/terms/) and [privacy](https://prothesmia.xyz/privacy/)
