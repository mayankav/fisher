const pup = require('puppeteer-core');
const moreBtnXPath = '/html/body/ytd-app/div/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[6]/div[2]/ytd-video-primary-info-renderer/div/div/div[3]/div/ytd-menu-renderer/yt-icon-button';
const openTranscriptBtnXPath = '/html/body/ytd-app/ytd-popup-container/tp-yt-iron-dropdown[1]/div/ytd-menu-popup-renderer/tp-yt-paper-listbox/ytd-menu-service-item-renderer';
const engagementPanelXPath = '/html/body/ytd-app/div/ytd-page-manager/ytd-watch-flexy/div[5]/div[2]/div/div[1]/ytd-engagement-panel-section-list-renderer/div[2]/ytd-transcript-renderer/div[1]/ytd-transcript-body-renderer';
const videoURL = 'https://www.youtube.com/watch?v=wJB90G-tsgo';

/* takes timeStamp (minutes:seconds) as an argument
 * returns refactoredTimeStamp converted in seconds
*/
function refactorTimeStamp (timeStamp) {
    const minutes = timeStamp.split(':')[0];
    const trailingSeconds = timeStamp.split(':')[1];
    const wholesomeSeconds = minutes*60;
    const refactoredTimeStamp = +trailingSeconds + wholesomeSeconds;
    return refactoredTimeStamp;
}

async function getTranscriptData() {
    const browser = await pup.launch({ 
        headless: true,
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        waitUntil: 'networkidle2'
     });
    const page = await browser.newPage();
    page.setViewport({ width : 1280, height : 926 });
    await page.goto(videoURL);
    await page.waitForXPath(moreBtnXPath);
    const moreBtnHandle = (await page.$x(moreBtnXPath))[0];
    await moreBtnHandle.click();
    await page.waitForXPath(openTranscriptBtnXPath);
    const openTranscriptBtnHandle = (await page.$x(openTranscriptBtnXPath))[0];
    await openTranscriptBtnHandle.click();
    await page.waitForXPath(engagementPanelXPath);
    const enagementPanelHandle = (await page.$x(engagementPanelXPath))[0];
    // selecting all child elements of enagementPanelHandle with class name 'cue-group'
    let cueGroupList = await enagementPanelHandle.$$(':scope > .cue-group'); 
    const transcriptData = {};
    const rawTranscriptData = {};
    for(let i = 0; i < cueGroupList.length; i++) {
        const cueGroupHandle = cueGroupList[i];
        const cueGroupStartHandle =  await cueGroupHandle.$(':scope > .cue-group-start-offset');
        const timeStamp = await cueGroupStartHandle.evaluate(domElement => domElement.textContent);
        const cuesHandle = await cueGroupHandle.$(':scope > .cues');
        const cueHandle = await cuesHandle.$(':scope > .cue');
        const caption = await cueHandle.evaluate(domElement => domElement.textContent);
        transcriptData[refactorTimeStamp(timeStamp.trim())] = caption.trim();
        rawTranscriptData[timeStamp.trim()] = caption.trim();
    }
    browser.close();
    console.log(transcriptData);
    return transcriptData;

    // https://youtu.be/dsv-CKHcotc?t=176
}
 
getTranscriptData();

