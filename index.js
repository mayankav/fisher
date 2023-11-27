/** file to be uploaded on aws s3 as zip and then imported into aws lambda */
const chromium = require("chrome-aws-lambda");
const AWS = require("aws-sdk");

const moreBtnXPath =
  "/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]/div/ytd-text-inline-expander/tp-yt-paper-button[1]";
const openTranscriptBtnXPath =
  "/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]/div/ytd-text-inline-expander/div[2]/ytd-structured-description-content-renderer/div/ytd-video-description-transcript-section-renderer/div[3]/div/ytd-button-renderer/yt-button-shape/button";
const videoURL = "https://www.youtube.com/watch?v=";

exports.handler = async (event, context, callback) => {
  let browser;
  const videoId = event.pathParameters.vid;
  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    // all your puppeteer things
    const transcript = await getTranscriptData(page);
    appendJsonToS3(transcript, videoId);
    callback(null, transcript);
  } catch (error) {
    callback(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

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

  async function getTranscriptData(page) {
    await page.goto(videoURL + videoId);
    await page.waitForXPath(moreBtnXPath);
    const moreBtnHandle = (await page.$x(moreBtnXPath))[0];
    await moreBtnHandle.click();
    await page.waitForXPath(openTranscriptBtnXPath);
    const openTranscriptBtnHandle = (await page.$x(openTranscriptBtnXPath))[0];
    await openTranscriptBtnHandle.click();
    await page.waitForSelector("#segments-container");
    const enagementPanelHandle = await page.$(`#segments-container`);
    // selecting all child elements of enagementPanelHandle with class name 'cue-group'
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
    return { rawTranscriptData, transcriptData };
  }

  async function appendJsonToS3(newData, fileName) {
    // S3 configuration
    const s3_bucket_name = "ytmate-transcript-bucket";
    const s3_object_key = `${fileName}.json`;

    // Initialize S3 instance
    const s3 = new AWS.S3();

    try {
      // Check if the object exists in S3
      try {
        await s3
          .headObject({ Bucket: s3_bucket_name, Key: s3_object_key })
          .promise();
      } catch (headObjectError) {
        // If the object doesn't exist, create a new one
        if (headObjectError.code === "NotFound") {
          console.log("Creating a new object in S3.");
          await s3
            .putObject({
              Bucket: s3_bucket_name,
              Key: s3_object_key,
              Body: JSON.stringify(newData),
              ContentType: "application/json",
            })
            .promise();
        } else {
          throw headObjectError; // Propagate other errors
        }
      }

      // Upload the JSON data to S3, overwriting the existing or newly created object
      await s3
        .putObject({
          Bucket: s3_bucket_name,
          Key: s3_object_key,
          Body: JSON.stringify(newData),
          ContentType: "application/json",
        })
        .promise();

      console.log("Object in S3 overwritten or created with new data!");
    } catch (error) {
      console.error("Error:", error);
      // You may choose to log the error or handle it in a specific way, depending on your requirements
    }
  }
};
