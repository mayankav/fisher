/* aws lambda counterpart - file meant for testing fisher locally on express server */
const pup = require("puppeteer-core");
const moreBtnXPath =
  "/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]/div/ytd-text-inline-expander/tp-yt-paper-button[1]";
const openTranscriptBtnXPath =
  "/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]/div/ytd-text-inline-expander/div[2]/ytd-structured-description-content-renderer/div/ytd-video-description-transcript-section-renderer/div[3]/div/ytd-button-renderer/yt-button-shape/button";
const commentXPath =
  "/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-comments/ytd-item-section-renderer/div[3]/ytd-comment-thread-renderer[1]/ytd-comment-renderer";
const videoURL = "https://www.youtube.com/watch?v=wJB90G-tsgo";

const youtubeCommentWebComponent = {
  comment: "ytd-comment-renderer",
  username: "yt-formatted-string",
};

/* takes timeStamp (minutes:seconds) as an argument
 * returns refactoredTimeStamp converted in seconds
 */
function refactorTimeStamp(timeStamp) {
  const minutes = timeStamp.split(":")[0];
  const trailingSeconds = timeStamp.split(":")[1];
  const wholesomeSeconds = minutes * 60;
  const refactoredTimeStamp = +trailingSeconds + wholesomeSeconds;
  return refactoredTimeStamp;
}

// Function to fetch YouTube comments
async function getCommentsFromPage(page) {
  await page.waitForXPath(commentXPath);
  const commentHandleList = await page.$$(youtubeCommentWebComponent.comment);
  const comments = [];

  for (let i = 0; i < commentHandleList.length; i++) {
    const commentHandle = commentHandleList[i];
    const commentTextHandle = await commentHandle.$("div#content");
    const headerHandles = await commentHandle.$$(
      youtubeCommentWebComponent.username
    );
    const userNameHandle = headerHandles[0];
    const userName = await userNameHandle?.evaluate(
      (domElement) => domElement.textContent
    );
    const commentTimeHandle = headerHandles[1];
    const commentTime = await commentTimeHandle?.evaluate(
      (domElement) => domElement.textContent
    );
    const commentText = await commentTextHandle?.evaluate(
      (domElement) => domElement.textContent
    );
    comments.push({
      userName,
      commentTime,
      commentText: commentText?.trim(),
    });
  }
  return comments;
}

// this fetches transcript + comments
// change name later
async function getTranscriptDataFromPage(page) {
  await page.waitForXPath(moreBtnXPath);
  const moreBtnHandle = (await page.$x(moreBtnXPath))[0];
  await moreBtnHandle.click();
  await page.waitForXPath(openTranscriptBtnXPath);
  const openTranscriptBtnHandle = (await page.$x(openTranscriptBtnXPath))[0];
  await openTranscriptBtnHandle.click();
  //await page.waitForXPath(engagementPanelXPath);
  await page.waitForSelector("#segments-container");

  //const enagementPanelHandle = (await page.$x(engagementPanelXPath))[0];
  const enagementPanelHandle = await page.$(`#segments-container`);
  // selecting all child elements of enagementPanelHandle with class name 'segment'
  let cueGroupList = await enagementPanelHandle.$$(":scope .segment");
  const transcriptData = {};
  const rawTranscriptData = {};
  for (let i = 0; i < cueGroupList.length; i++) {
    const cueGroupHandle = cueGroupList[i];
    const cueGroupStartHandle = await cueGroupHandle.$(
      ":scope .segment-timestamp"
    );
    const timeStamp = await cueGroupStartHandle.evaluate(
      (domElement) => domElement.textContent
    );
    const cueHandle = await cueGroupHandle.$(":scope .segment-text");
    const caption = await cueHandle.evaluate(
      (domElement) => domElement.textContent
    );
    transcriptData[refactorTimeStamp(timeStamp.trim())] = caption.trim();
    rawTranscriptData[timeStamp.trim()] = caption.trim();
  }
  return transcriptData;
  // https://youtu.be/dsv-CKHcotc?t=176
}

async function getData() {
  const browser = await pup.launch({
    headless: false,
    // for mac
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // for windows
    // executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    waitUntil: "networkidle2",
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1280, height: 926 });
  await page.goto(videoURL);
  const transcript = await getTranscriptDataFromPage(page);
  console.log("\x1b[31m", `-----------TRANSCRIPT-----------`);
  const comments = await getCommentsFromPage(page);
  console.log("\x1b[31m", `-----------COMMENTS-----------`);
  console.log(comments);
  console.log(transcript);
  browser.close();
}

getData();
