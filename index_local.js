/* aws lambda counterpart - file meant for testing fisher locally on express server */
const pup = require("puppeteer-core");
const moreBtnXPath =
  "/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]/div/ytd-text-inline-expander/tp-yt-paper-button[1]";
const openTranscriptBtnXPath =
  "/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]/div/ytd-text-inline-expander/div[2]/ytd-structured-description-content-renderer/div/ytd-video-description-transcript-section-renderer/div[3]/div/ytd-button-renderer/yt-button-shape/button";
const videoURL = "https://www.youtube.com/watch?v=wJB90G-tsgo";

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

async function getTranscriptData() {
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
  console.warn("page", page);
  page.setViewport({ width: 1280, height: 926 });
  await page.goto(videoURL);
  await page.waitForXPath(moreBtnXPath);
  const moreBtnHandle = (await page.$x(moreBtnXPath))[0];
  await moreBtnHandle.click();
  console.log("more button clicked....");
  await page.waitForXPath(openTranscriptBtnXPath);
  const openTranscriptBtnHandle = (await page.$x(openTranscriptBtnXPath))[0];
  await openTranscriptBtnHandle.click();
  console.log("open Transcript Btn clicked....");
  //await page.waitForXPath(engagementPanelXPath);
  await page.waitForSelector("#segments-container");
  //const enagementPanelHandle = (await page.$x(engagementPanelXPath))[0];
  const enagementPanelHandle = await page.$(`#segments-container`);
  console.log("enagagement panel -", enagementPanelHandle);
  // selecting all child elements of enagementPanelHandle with class name 'segment'
  let cueGroupList = await enagementPanelHandle.$$(":scope .segment");
  console.log("cue list -", cueGroupList);
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
  browser.close();
  console.log(transcriptData);
  return transcriptData;

  // https://youtu.be/dsv-CKHcotc?t=176
}

getTranscriptData();
