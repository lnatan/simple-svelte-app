export const URL_LIST = 'https://api.themoviedb.org/3/discover/movie';
export const URL_SEARCH = 'https://api.themoviedb.org/3/search/movie?query=';
export const URL_DETAIL = 'https://api.themoviedb.org/3/movie/';
export const URL_PERSON = 'https://api.themoviedb.org/3/person/';
export const URL_IMG = 'https://image.tmdb.org/t/p/';
export const URL_YOUTUBE = 'https://www.youtube.com/embed/';
export const URL_CAST = '/casts';
export const URL_VIDEO = '/videos';
export const IMG_SIZE_XSMALL = 'w45/';
export const IMG_SIZE_SMALL = 'w150/';
export const IMG_SIZE_LARGE = 'w342/';
export const CAST_MAX_NUM = 5;
export const TRAILER_MAX_NUM = 3;
export const API_KEY = '?api_key=b6a21b30d0a02dbb844bbfb52fb1d2ec';
export const API_KEY_ALT = '&api_key=b6a21b30d0a02dbb844bbfb52fb1d2ec';

export const PAGE = '&page=';
export const SORT_BY_RELEASE_DATE_ASC = '&sort_by=primary_release_date.asc';
export const FILTER_RELEASE_TYPE_THEATRICAL = '&with_release_type=3';
export const FILTER_PRIMARY_RELEASE_DATE_GTE = '&primary_release_date.gte=';

export const UPCOMING = URL_LIST + API_KEY + FILTER_RELEASE_TYPE_THEATRICAL + FILTER_PRIMARY_RELEASE_DATE_GTE;