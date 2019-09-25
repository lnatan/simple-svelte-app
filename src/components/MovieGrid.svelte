<script>
  import MovieCard from "./MovieCard.svelte";
  import { flip } from "svelte/animate";
  import { fade } from 'svelte/transition';

  export let movies;
  export let hidden;

</script>

<div class='columns is-mobile is-centered is-multiline' transition:fade>    
  {#each movies as movie (movie.id)}     
    <div class="column is-narrow" animate:flip={{ duration: 300 }}>
      <MovieCard
        id={movie.id}
        title={movie.title}
        rate={movie.popularity}
        date={movie.release_date}          
        poster={movie.poster_path}
        invisible={hidden}         
        on:click
      />
      </div>         
  {/each}
</div>