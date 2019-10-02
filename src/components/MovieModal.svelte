<script>
  import movieStore from "../store/movieStore.js"; 
  import { createEventDispatcher } from 'svelte';
  import { animateModal } from '../utils/animations';  
  import { sineOut, cubicInOut } from "svelte/easing";
  import { fade } from 'svelte/transition';
  import { URL_IMG, IMG_SIZE_LARGE } from '../api';

  export let id;
  export let position;
  export let imageSize;  

  let disableClick = false;  // disable click when animation

  const movie = $movieStore.find((movie) => movie.id === id);
 
  const modalBodyStyle = `top: ${position.top}px; left: ${position.left}px`;
  const modalImageStyle = `width: ${imageSize.width}px; height: ${imageSize.height}px`; 

  const startTop = position.top;
  const startLeft = position.left;
  const endTop = window.innerHeight/2 - imageSize.height/2;
  const endLeft = document.documentElement.clientWidth/2 - imageSize.width;

  const animationOpt = {
    // duration: 1000,
    easing: sineOut,
    start: 1,
    end: 1.2, 
    x1: startLeft,
    y1: startTop,
    x2: endLeft,
    y2: endTop
  };

  const scrollY = window.scrollY;

  const dispatch = createEventDispatcher();

  function handleClick() {    
    if ( disableClick ) return false;
    dispatch('close');
  }
</script>

<style lang='scss'>
  @import '../styles/modal.scss';
  
  h2 {
    font-size: $size-3;
    font-family: $family-secondary;
    text-transform: uppercase; 
    padding-bottom: 1rem;
  }

  .image img {
    height: 100%;
  }

  .modal {
    display: flex;
    cursor: pointer;
    pointer-events: auto;
  }

  .modal-body {
    position: absolute;
    transform: scale(1.2);
    display: flex;
  }

  .content {
    padding: 20px 40px;
    width: 410px;
  }

  .is-unclickable, .is-unclickable > * {
    pointer-events: none;
  }
</style>

<div class="modal" on:click={handleClick} class:is-unclickable={disableClick}>    
    <div class="modal-background" in:fade={{ easing: cubicInOut }} out:fade={{ delay: 400 }}/>
    <div class="modal-body" 
      style={modalBodyStyle} 
      transition:animateModal={animationOpt} 
      on:introstart={() => disableClick = true}
      on:outrostart={() => window.scroll(0,scrollY)}>
      <div class="image" class:thumb-placeholder={!movie.poster_path} style={modalImageStyle}>
        <img src="{URL_IMG+IMG_SIZE_LARGE+movie.poster_path}" alt={movie.title}>
      </div>
      <div class="content" 
        in:fade={{ delay: 600 }} 
        out:fade={{ duration: 0 }}
        on:introend={() => disableClick = false}>    
          <h2>{movie.title}</h2>
          <p>{movie.overview}</p>
          <br>
          <p>Release date: {movie.release_date}</p>
          <p>Rating: {movie.popularity}</p>
        </div>
    </div>  
    <button class="modal-close is-large" aria-label="close"/> 
</div>