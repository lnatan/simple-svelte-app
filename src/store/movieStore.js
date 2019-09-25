import { writable } from 'svelte/store';

const movies = writable([]);

const customStore = {
  subscribe: movies.subscribe,
  setMovies: items => {
    movies.set(items);
  }
};

export default customStore;