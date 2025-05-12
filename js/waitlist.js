// waitlist.js - Handles waitlist functionality for tracking TV shows

// Daily scheduling helper: only runs update if 24 hours have passed since the last run.
function runDailyWaitlistUpdate() {
  console.log("runDailyWaitlistUpdate called");
  const lastUpdate = Number(localStorage.getItem('waitlistLastUpdate'));
  const now = Date.now();
  if (!lastUpdate || now - lastUpdate > 24 * 60 * 60 * 1000) {
    setTimeout(function() {
      updateWaitlistRecords().then(() => {
      localStorage.setItem('waitlistLastUpdate', now);
      });
    }, 2000);
  }
}

async function updateWaitlistRecords() {
  console.log("updateWaitlistRecords called"); // Existing log

  const allTvProgress = await window.getAllTvProgress();

  if (!allTvProgress || allTvProgress.length === 0) {
    console.log("No TV progress records found. Exiting updateWaitlistRecords.");
    return;
  }

  const waitlistRecords = allTvProgress.filter(record => {
    const status = window.getProgressStatus(record);
    return status === "waitlist";
  });

  if (waitlistRecords.length === 0) {
    console.log("No records meet the 'waitlist' criteria. Exiting updateWaitlistRecords.");
    return;
  }

  for (const record of waitlistRecords) {
    const details = await window.fetchGeneral(record.id, 'tv');
    if (!details) {
      continue;
    }


    if (!details.in_production) {
      await window.addWatched(details);
      await window.removeTvProgress(record.id);
      continue;
    }

    const newNextEpisode = details.next_episode_to_air ? details.next_episode_to_air.episode_number : null;
    const newNextSeason = details.next_episode_to_air ? details.next_episode_to_air.season_number : null;
    const newNextEpisodeAirDate = details.next_episode_to_air ? details.next_episode_to_air.air_date : null;

    const newLastSeason = details.last_episode_to_air ? details.last_episode_to_air.season_number : record.lastSeason;
    const newLastEpisode = details.last_episode_to_air ? details.last_episode_to_air.episode_number : record.lastEpisode;
    const newLastEpisodeAirDate = details.last_episode_to_air ? details.last_episode_to_air.air_date : record.lastEpisodeAirDate;


    if (record.nextEpisode !== newNextEpisode ||
        record.nextSeason !== newNextSeason ||
        record.nextEpisodeAirDate !== newNextEpisodeAirDate ||
        record.lastSeason !== newLastSeason ||
        record.lastEpisode !== newLastEpisode ||
        record.lastEpisodeAirDate !== newLastEpisodeAirDate ||
        record.inProduction !== details.in_production) {

      console.log(`Update needed for ID: ${record.id}. Calling window.updateTvProgress.`);
      await window.updateTvProgress(
        record.id,
        record.season, // Current watched season
        record.episode, // Current watched episode
        details.in_production,
        record.currentTime,
        record.totalDuration,
        newNextEpisode,
        newNextSeason,
        newNextEpisodeAirDate,
        newLastSeason,
        newLastEpisode,
        newLastEpisodeAirDate
      );
      console.log(`Record ID: ${record.id} update call finished.`);
    } else {
    }
  }
  console.log("Finished processing all waitlist records.");
}

// Export functions to window
window.runDailyWaitlistUpdate = runDailyWaitlistUpdate;
window.updateWaitlistRecords = updateWaitlistRecords;