// storage.js - Adapted for Local Use with Hardcoded User ID

(function() {
  // Define the hardcoded user ID you want to use locally
  const HARDCODED_USER_ID = "user";

  // --- getCurrentUserId function REMOVED ---
  // We will use HARDCODED_USER_ID directly

  // Initialize Dexie with your database name (NO Dexie Cloud addon)
  var db = new Dexie("StreamBoxDexieDB");

  // Define your tables - KEEP THE SCHEMA THE SAME as your cloud version
  // This ensures compatibility with your existing local data.
  db.version(1).stores({
    favorites: "[user_id+id], user_id, id, type, title, overview, poster_path, backdrop_path, vote_average, release_date, genre_ids, timestamp",
    watched: "[user_id+id], user_id, id, type, title, overview, poster_path, backdrop_path, vote_average, release_date, genre_ids, timestamp",
    tvProgress: "[user_id+id], user_id, id, season, episode, inProduction, currentTime, totalDuration, nextEpisode, nextSeason, nextEpisodeAirDate, lastSeason, lastEpisode, lastEpisodeAirDate, updatedAt",
    movieProgress: "[user_id+id], user_id, id, currentTime, totalTime, updatedAt"
  });

  // --- Dexie Cloud Configuration REMOVED ---

  // -------------------- Favorites and Watched --------------------

  window.addFavorite = function(item) {
    return db.favorites.put({
      user_id: HARDCODED_USER_ID, // Use hardcoded ID
      id: item.id,
      type: item.type,
      title: item.title || item.name,
      overview: item.overview,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      genre_ids: item.genre_ids,
      timestamp: Date.now()
    });
  };

  window.addWatched = function(item) {
    return db.watched.put({
      user_id: HARDCODED_USER_ID, // Use hardcoded ID
      id: item.id,
      type: item.type,
      title: item.title || item.name,
      overview: item.overview,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      genre_ids: item.genre_ids,
      timestamp: Date.now()
    });
  };

  window.removeFavorite = function(tmdbId, type) {
    // Query using the hardcoded user ID
    return db.favorites.where({ user_id: HARDCODED_USER_ID, id: parseInt(tmdbId, 10), type: type }).delete();
  };

  window.getFavorites = function() {
    // Query using the hardcoded user ID
    return db.favorites.where({ user_id: HARDCODED_USER_ID }).toArray();
  };

  window.removeWatched = function(tmdbId, type) {
     // Query using the hardcoded user ID
    return db.watched.where({ user_id: HARDCODED_USER_ID, id: parseInt(tmdbId, 10), type: type }).delete();
  };

  window.getWatched = function() {
    // Query using the hardcoded user ID
    return db.watched.where({ user_id: HARDCODED_USER_ID }).toArray();
  };

  // -------------------- TV and Movie Progress --------------------

 window.addTvProgress = function(id, season, episode, inProduction, currentTime, totalDuration, nextEpisode, nextSeason, nextEpisodeAirDate, lastSeason, lastEpisode, lastEpisodeAirDate) {
    return db.tvProgress.put({
      user_id: HARDCODED_USER_ID, // Use hardcoded ID
      id: Number(id),
      season: season,
      episode: episode,
      inProduction: inProduction,
      currentTime: currentTime,
      totalDuration: totalDuration,
      nextEpisode: nextEpisode,
      nextSeason: nextSeason,
      nextEpisodeAirDate: nextEpisodeAirDate,
      lastSeason: lastSeason,
      lastEpisode: lastEpisode,
      lastEpisodeAirDate: lastEpisodeAirDate,
      updatedAt: Date.now()
    });
  };

  window.addMovieProgress = function(id, currentTime, totalTime) {
    return db.movieProgress.put({
      user_id: HARDCODED_USER_ID, // Use hardcoded ID
      id: Number(id),
      currentTime: currentTime,
      totalTime: totalTime,
      updatedAt: Date.now()
    });
  };

  window.updateTvProgress = function(id, season, episode, inProduction, currentTime, totalDuration, nextEpisode, nextSeason, nextEpisodeAirDate, lastSeason, lastEpisode, lastEpisodeAirDate) {
    // Query using the hardcoded user ID
    return db.tvProgress.where({ user_id: HARDCODED_USER_ID, id: Number(id) }).modify({
      season: season,
      episode: episode,
      inProduction: inProduction,
      currentTime: currentTime,
      totalDuration: totalDuration,
      nextEpisode: nextEpisode,
      nextSeason: nextSeason,
      nextEpisodeAirDate: nextEpisodeAirDate,
      lastSeason: lastSeason,
      lastEpisode: lastEpisode,
      lastEpisodeAirDate: lastEpisodeAirDate,
      updatedAt: Date.now()
    });
  };

  window.updateMovieProgress = function(id, currentTime, totalTime) {
    // Query using the hardcoded user ID
    return db.movieProgress.where({ user_id: HARDCODED_USER_ID, id: Number(id) }).modify({
      currentTime: currentTime,
      totalTime: totalTime,
      updatedAt: Date.now()
    });
  };

  window.removeTvProgress = function(tmdbId) {
    // Query using the hardcoded user ID
    return db.tvProgress.where({ user_id: HARDCODED_USER_ID, id: Number(tmdbId) }).delete();
  };

  window.getTvProgress = function(tmdbId) {
    // Query using the hardcoded user ID
    return db.tvProgress.where({ user_id: HARDCODED_USER_ID, id: Number(tmdbId) }).first();
  };

  window.getAllTvProgress = function() {
    // Query using the hardcoded user ID
    return db.tvProgress.where({ user_id: HARDCODED_USER_ID }).toArray();
  };

  window.removeMovieProgress = function(tmdbId) {
    // Query using the hardcoded user ID
    return db.movieProgress.where({ user_id: HARDCODED_USER_ID, id: Number(tmdbId) }).delete();
  };

  window.getMovieProgress = function(tmdbId) {
    // Query using the hardcoded user ID
    return db.movieProgress.where({ user_id: HARDCODED_USER_ID, id: Number(tmdbId) }).first();
  };

  window.getAllMovieProgress = function() {
    // Query using the hardcoded user ID
    return db.movieProgress.where({ user_id: HARDCODED_USER_ID }).toArray();
  };

  // -------------------- Backup Export/Import --------------------
  // These functions will now export/import data specifically for the hardcoded user.

  window.exportBackup = function() {
    Promise.all([
      // Fetch data for the hardcoded user
      db.favorites.where({ user_id: HARDCODED_USER_ID }).toArray(),
      db.watched.where({ user_id: HARDCODED_USER_ID }).toArray(),
      db.tvProgress.where({ user_id: HARDCODED_USER_ID }).toArray(),
      db.movieProgress.where({ user_id: HARDCODED_USER_ID }).toArray()
    ])
      .then(function(results) {
        var backupData = {
          favorites: results[0],
          watched: results[1],
          tvProgress: results[2],
          movieProgress: results[3]
          // user_id will be present in the records
        };
        var backupStr = JSON.stringify(backupData, null, 2);
        var now = new Date();
        var timestamp = now.getFullYear() + '-' +
                        String(now.getMonth() + 1).padStart(2, '0') + '-' +
                        String(now.getDate()).padStart(2, '0') + '_' +
                        String(now.getHours()).padStart(2, '0') + '-' +
                        String(now.getMinutes()).padStart(2, '0') + '-' +
                        String(now.getSeconds()).padStart(2, '0');
        var blob = new Blob([backupStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        // Indicate user in filename (optional but helpful)
        link.download = `streambox_backup_${HARDCODED_USER_ID}_${timestamp}.json`;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch(function(error) {
        console.error("Export backup failed:", error);
        alert("Failed to export backup.");
      });
  };

  window.importBackup = function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var backupData = JSON.parse(e.target.result);
        var uid = HARDCODED_USER_ID; // Use the hardcoded ID for import context

        // Ensure imported records are assigned the correct user_id if missing,
        // or potentially overwrite if the backup was from a different user (use with caution).
        ["favorites", "watched", "tvProgress", "movieProgress"].forEach(function(tableName) {
          if (backupData[tableName] && Array.isArray(backupData[tableName])) {
            backupData[tableName] = backupData[tableName].map(function(record) {
              // Force the record's user_id to match the hardcoded one
              record.user_id = uid;
              return record;
            });
          }
        });

        // Clear only the data for the hardcoded user before importing
        Promise.all([
          db.favorites.where({ user_id: uid }).delete(),
          db.watched.where({ user_id: uid }).delete(),
          db.tvProgress.where({ user_id: uid }).delete(),
          db.movieProgress.where({ user_id: uid }).delete()
        ])
          .then(function() {
            // Bulk add the (potentially modified) data
            return Promise.all([
              db.favorites.bulkAdd(backupData.favorites || []),
              db.watched.bulkAdd(backupData.watched || []),
              db.tvProgress.bulkAdd(backupData.tvProgress || []),
              db.movieProgress.bulkAdd(backupData.movieProgress || [])
            ]);
          })
          .then(function() {
            alert("Backup imported successfully for user " + uid + ". Please refresh.");
            window.location.reload(); // Force reload
          })
          .catch(function(error) {
            console.error("Import backup failed:", error);
            alert("Error importing backup: " + error.message);
          });
      } catch (error) {
        console.error("Import backup failed (parsing error):", error);
        alert("Error reading or parsing backup file: " + error.message);
      }
    };
    reader.onerror = function() {
        console.error("Failed to read the backup file.");
        alert("Failed to read the backup file.");
    };
    reader.readAsText(file);
  };

  // --- Authentication and Sync Helpers REMOVED ---
  // --- updateLoginStatus, signIn, signOut, dialog hiding logic REMOVED ---

  // Attach the db instance to window so it’s available globally.
  window.db = db;

  // Initial setup message for local mode
  document.addEventListener("DOMContentLoaded", function() {
      console.log(`Running in local Dexie mode for user: ${HARDCODED_USER_ID}`);
      // You might want to refresh data display on load
      if (typeof window.refreshUserData === "function") {
          window.refreshUserData();
      }
      // Remove or hide login/logout UI elements if they still exist in HTML
      const loginBtn = document.getElementById("loginBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      const loginStatus = document.getElementById("loginStatus");
      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "none";
      if (loginStatus) loginStatus.textContent = `Local (${HARDCODED_USER_ID.split('@')[0]})`; // Display local status
  });

})();
