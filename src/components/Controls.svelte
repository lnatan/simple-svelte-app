<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  let selectedButton = 'rate';

  function sortByDate(movie1, movie2){
   if (movie1.release_date === movie2.release_date) return 0;
   return movie1.release_date > movie2.release_date ? 1 : -1;
  };

</script>


<style lang='scss'>
  @import '../styles/button.scss';

  .controls {
    margin-bottom: 2rem;
    text-align: center;
  }

</style>

<div class="controls">
  <button
    type="button"
    class="button"
    class:is-active={selectedButton === 'rate'}
    on:click={() => {
      selectedButton = 'rate';
      dispatch('select', 'default');
    }}>
    Sort be rate
  </button>
  <button
    type="button"
    class="button"
    class:is-active={selectedButton === 'date'}
    on:click={() => {
      selectedButton = 'date';
      dispatch('select', sortByDate);
    }}>
    Sort by date
  </button>
</div>