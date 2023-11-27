# Fisher

Transcript scraper for YouTube videos

## Notes

- **index_local.js** - intended for testing
- **index.js** - must be kept in the root of the project. Be careful while zipping the project up to eventually upload in s3 bucket

zip fisher.zip index.js
aws s3 cp fisher.zip s3://fisher-yt-scraper/
