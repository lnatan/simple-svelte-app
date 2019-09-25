<script>
  import { createEventDispatcher } from 'svelte';
  import { URL_IMG, IMG_SIZE_LARGE } from '../api';
     
  const dispatch = createEventDispatcher();
  
  export let title;
  export let poster;
  export let rate;
  export let date;
  export let id;
  export let invisible;

  let card; 
  
  // onMount(() => {
  //   console.log('Card ' + id + ' onMount');
  // });

  function handleClick() {
    const position = {};
    const imageSize = {};

    position.top = card.getBoundingClientRect().top;
    console.log(card.offsetTop, card.offsetParent);
    position.left = card.getBoundingClientRect().left;
    imageSize.width = card.querySelector('img').offsetWidth;
    imageSize.height = card.querySelector('img').offsetHeight;
    
    dispatch('click', { id, position, imageSize });
  }
</script>

<style lang='scss'>
  @import '../styles/card.scss';

  h2 {
    font-size: $size-5;
    font-family: $family-secondary; 
  }

  .is-invisible {
    opacity: 0;
    visibility: hidden;
  }

  .card {
    border-radius: 3px;
    max-width: 342px;
    height: 100%;
  }

  .card-link {
    color: inherit; 
    cursor: pointer;
  }

  .card-image img {
    max-width: 342px;
    max-height: 484px;
    height: auto;
  }
</style>

<div class="card card-link" 
    class:is-invisible={invisible}
    bind:this={card} 
    on:click|preventDefault={handleClick}>
  <figure class="card-image image" class:thumb-placeholder={!poster}>
    <img src="{URL_IMG+IMG_SIZE_LARGE+poster}" alt={title}>
  </figure>
  <div class="card-content">
    <h2>{title}</h2>
    <p>Rating: {rate}</p>
    <p>Release: {date}</p>
  </div>
</div>