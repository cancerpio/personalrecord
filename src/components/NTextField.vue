 <template>
  <v-text-field class="v-text-field"
                v-bind="$attrs"
                v-on="$listeners"
                outlined>
    <template v-for="(_, slot) of scopedSlots"
              v-slot:[slot]>
      <slot :name="slot" />
    </template>
  </v-text-field>
</template>

<script>
export default {
  name: 'NTextField'
}
</script>

<style scoped lang="sass">
</style>

<!-- normal : width: 760px;
height: 40px;
border: 1px solid #dae0e6;
border-radius: 4px; -->
