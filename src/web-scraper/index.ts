import axios, { AxiosResponse } from 'axios';

const MAX_SIZE = 100_000;

class Queue<T> {
    private items: Array<T>;
    private maxSize: number;
    private startIndex: number;
    private flushSize: number;

    constructor(maxSize?: number) {
        if (maxSize === 0) throw new Error('Cannot initialise queue of size 0');
        if (maxSize && maxSize > MAX_SIZE) throw new Error('Queue size cannot be greater than ' + MAX_SIZE);
        
        this.startIndex = 0;
        this.items = new Array();
        this.maxSize = maxSize || MAX_SIZE;
        this.flushSize = 1;
    }

    public enqueue(item: T): void {
        if (this.isFull()) throw new Error('Queue Overflow');
        const newFlushSize = this.items.push(item);
        this.flushSize = Math.ceil(newFlushSize / 2);
    }

    // Amortised: O(1)
    public dequeue(): T {
        if (this.isEmpty()) throw new Error('Queue Underflow');
        if (this.startIndex === this.flushSize) {
            this.items.splice(0, this.flushSize);
            this.startIndex = 0;
            this.flushSize = Math.ceil(this.size() / 2);
        }
        return this.items[this.startIndex++];
    }

    public peek(): T {
        if (this.isEmpty()) throw new Error('Queue Underflow');
        return this.items[this.startIndex];
    }

    public printElements(): void {
        if (this.isEmpty()) console.log('Empty Queue');
        console.log('Queue Values: ', this.items);
    }

    public isEmpty(): boolean {
        return this.size() === 0;
    }

    public size(): number {
        return this.items.length - this.startIndex;
    }

    public flush(): void {
        this.items = new Array();
    }

    public isFull(): boolean {
        return this.maxSize === this.size();
    }
}

export class WebScraper {
    
    private seedURLs: string[];
    private maxChildURLs: number;
    private maxDepth: number;
    private childURLs: Queue<string>;
    private userAgent: string;
    
    constructor(seedURLs: string[]) {
        this.seedURLs = seedURLs;
        this.maxChildURLs = 10;
        this.maxDepth = 50
        this.childURLs = new Queue<string>();
        this.userAgent = 'EOD-NHOJ';
    }

    private async getScrapableUrls(uniqueHosts: string[]) {
        const batchSize = 50;
        let currentIndex = 0;

        const allowedHosts: { host: string, allowedPaths: string[], disallowedPaths: string[], crawlDelay: number }[] = [];
        
        while (currentIndex <= uniqueHosts.length) {
            
            const promiseArray: Promise<AxiosResponse<any, any>>[] = [];
    
            for (let index = currentIndex; index < Math.min(uniqueHosts.length, currentIndex + batchSize); index++) {
                const host = uniqueHosts[index];
                promiseArray.push(axios.get(host + '/robots.txt', { responseType: 'stream' }))
            }

            const responses = await Promise.allSettled(promiseArray);

            for (const index in responses) {
                const response = responses[index];
                
                const hostData: {
                    host: string,
                    allowedPaths: string[],
                    disallowedPaths: string[],
                    sitemap: string,
                    crawlDelay: number
                } = {
                    host: '',
                    allowedPaths: [],
                    disallowedPaths: [],
                    sitemap: '',
                    crawlDelay: 1000
                }
                
                if (response.status === 'rejected') {
                    
                    console.log('error while fetching robots.txt for host ' + uniqueHosts[index] + ': ' + response.reason);
                    
                    if (response.reason?.status == 400) {
                        hostData.host = uniqueHosts[index];
                        hostData.allowedPaths.push('/');
                    }
                    continue;
                }

                const scrapingRules = response.value.data;

                // console.log('scrapingRules:\n', scrapingRules);

                if (!scrapingRules.length) {
                    
                    allowedHosts.push({
                        host: uniqueHosts[index],
                        allowedPaths: [],
                        disallowedPaths: [],
                        crawlDelay: 1000
                    })
                    
                    continue;
                }

                const splitRules = scrapingRules.split('\n');

                let updateConfig = true;
                
                for (const line of splitRules) {
                    
                    if (line.includes('Sitemap: ')) {
                        hostData.sitemap = line.slice('Sitemap: '.length, line.length);
                    }
                    
                    if (updateConfig) {
                        if (line === 'User-agent: *') {
                            hostData.host = uniqueHosts[index];
                        } else if (line.includes('User-agent: ') && hostData.host.length && (hostData.allowedPaths.length || hostData.disallowedPaths.length)) {
                            updateConfig = false;
                        } else if (hostData.host.length) {
                            if (line.includes('Allow: ')) {
                                hostData.allowedPaths.push(line.slice('Allow: '.length, line.length));
                            } else if (line.includes('Disallow: ')) {
                                hostData.disallowedPaths.push(line.slice('Disallow: '.length, line.length));
                            }
                        }
                    }
                }
                
                if (hostData.host.length) {
                    allowedHosts.push(hostData);
                }

            }

            currentIndex += batchSize;

        }
        return allowedHosts;
    }

    public async scrape() {
        const uniqueHostsSet = new Set(
            this.seedURLs.map((url) => {
                return url.split('/').slice(0,3).join('/')
            })
        );
        const scrapableUrls = await this.getScrapableUrls(Array.from(uniqueHostsSet.values()));
        
    }
}

const scraper = new WebScraper(['https://google.com/', 'https://www.producthunt.com']);
scraper.scrape();