# Movie and TV Show Tracker

This project is a web application for tracking movies and TV shows. Users can add items to their watchlist, watched list, and track the current watching state for TV shows. 
It uses IndexedDB to store data, so there is no need for a login process, but I highly recommend backing up your data frequently.

## Features

- **Favorites and Watchlist Management**: Add and remove movies and TV shows from your favorites and watchlist.
- **Current Watching State**: Track the current episode of TV shows you are watching.
- **Detailed Information**: View detailed information about movies and TV shows, including trailers, cast, crew, and similar items.
- **Filtering and Sorting**: Filter and sort items based on genre, year, and rating.
- **Random Movie Selection**: Get a random movie recommendation from your favorites list.
- **Backup and Restore**: Backup and restore your favorites, watchlist, and current watching state.

## Setup

### Prerequisites

- A modern web browser (e.g., Chrome, Firefox, Safari)

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/your-username/movie-tv-tracker.git
    cd movie-tv-tracker
    ```

2. Open common.js and write your TMDB API key on the first line.
3. Open the `index.html` file in your web browser to start the application.

## Usage

### Adding Items to Favorites and Watchlist

- To add an item to your favorites or watchlist, click the respective icon on the movie or TV show card.
- To remove an item, click the icon again.

### Filtering and Sorting

- Use the filters on the items page to filter by genre, year, and rating.
- Use the dropdown to switch between movies and TV shows.

### Viewing Details

- Click on a movie or TV show card to view detailed information, including trailers, cast, crew, and similar items.

### Backup and Restore

- Use the backup button to download your data as a JSON file.
- Use the restore button to upload a previously downloaded JSON file and restore your data.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Open a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [TMDB API](https://www.themoviedb.org/documentation/api) for providing movie and TV show data.
