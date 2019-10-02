import { writable } from 'svelte/store';

const movies = writable([]);

const movieStore = {
  subscribe: movies.subscribe,
  setMovies: items => {
    movies.set(items);
  }
};

export default movieStore;