<script>
  import MovieGrid from "./components/MovieGrid.svelte";
  import MovieModal from "./components/MovieModal.svelte";
  import Footer from "./components/Footer.svelte";
  import Controls from "./components/Controls.svelte";
  import { onMount } from 'svelte';
  import { UPCOMING } from "./api";
  import currentDate from "./utils/date";
  import movieStore from "./store/movieStore.js"; 
 
  let isLoading = true;
  let modal = false; 
  let clickedMovieDetails;
  let sortTypeFn;  

  $: sortedMovies = sortTypeFn === 'default' ? $movieStore : [...$movieStore].sort(sortTypeFn);
  
  const URL = UPCOMING + currentDate;

  onMount(() => {
    fetch(URL)
      .then(res => {
        if (!res.ok) {
          throw new Error("Connection failed");
        }
        return res.json();
      })
      .then(data => {
        if (!data.results.length) {
        throw new Error("Results is empty");
        }
        isLoading = false;
        movieStore.setMovies(data.results);
      })
      .catch(error => {
        console.error(error);
      });
  });

  function showModal(event) {
    modal = true;
    clickedMovieDetails = event.detail;
  }

  function closeModal() {
    modal = false;
    clickedMovieDetails = null;
  }

  function setSorting(event){
    sortTypeFn = event.detail;
  }
</script>

<style global lang='scss'>
  @import './styles/app.scss';
  h1 {
    font-size: $size-2;
    font-family: $family-secondary;
    text-transform: uppercase;    
    text-align: center;
    padding: 1em 0;    
  }
  .loading {
    font-size: $size-4;
    height: calc(100vh - 200px);
    text-align: center;
    padding: 1em 0;    
  }
</style>

<div class='container'>
  <h1>Upcoming movies</h1>  
  <Controls on:select={setSorting}/>
  {#if isLoading}
    <div class="loading">...Is loading</div>
  {:else}
    <MovieGrid
      movies={sortedMovies}
      hidden={modal}
      on:click={showModal}
    />
  {/if}  
  {#if modal}
    <MovieModal 
      id={clickedMovieDetails.id}
      position={clickedMovieDetails.position} 
      imageSize={clickedMovieDetails.imageSize}
      on:close={closeModal}  
    />
  {/if} 
</div>
<Footer />