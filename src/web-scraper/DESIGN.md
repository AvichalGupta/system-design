Functionalities:
- Take a set of seed URLs.
- Fetch robots.txt of each unique host.
    - If scraping disallowed, move to next url.
    - If scraping allowed, scrape page.
- Check if scraped page is duplicate / has duplicate content.
- From scraped page, fetch next set of URLs.
- Check for already scraped URLs, ignore those.
- Allow host prioritisation, to scrape higher quality data.
- Repeat process from step 2.

Datastructures
- Arrays (to store all URLs scraped from current level)
- Priority Queues
- Max Heaps (used in priority queues)
- Tree
- Set/Map (used to store visited URLs)

Design:

Take a list of urls. Store unique hosts,
Check robots.txt from hosts
