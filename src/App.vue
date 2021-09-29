<template>
  <v-app>
    <!-- <v-navigation-drawer app dark expand-on-hover bottom> -->
    <v-navigation-drawer app dark bottom>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="text-h6"> Programs </v-list-item-title>
          <v-list-item-subtitle> </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-navigation-drawer>

    <v-app-bar app> app BAR </v-app-bar>

    <!-- Sizes your content based upon application components -->
    <v-main>
      <li v-for="(action, index) in actions" :key="index">
        <v-card class="mx-left" max-width="600">
          <v-card-title>{{ action }}</v-card-title>
          <!-- TODO: table: Misc #CRUD Actions or use Grid,Flex -->
          <v-data-table
            v-show="isEdit === false"
            :headers="headers"
            :items="records[action]"
            :items-per-page="5"
            class="elevation-1"
          >
            <template v-slot:item.actions>
              <span><v-btn @click="onClick(true)">Edit set</v-btn> </span>
              <span><v-btn>Delete</v-btn> </span>
            </template>
            <!-- <template v-slot:footer><v-btn>Add set</v-btn></template> -->
          </v-data-table>
          <v-data-table
            v-show="isEdit === true"
            :headers="headers"
            :items-per-page="5"
            class="elevation-1"
          >
            <!-- <template slot:item><v-input></v-input></template> -->
            <template slot:item.actions><v-btn @click="onSave()">Save</v-btn></template>
            <template slot:item.actions
              ><v-btn @click="onClick(false)">Cancel</v-btn></template
            >
          </v-data-table>
        </v-card>
      </li>
      <button>Add Action</button>
      <!-- Provides the application the proper gutter -->
      <v-container>
        <!-- If using vue-router -->
        <router-view></router-view>
      </v-container>
    </v-main>

    <v-footer app>
      <!-- -->
    </v-footer>
  </v-app>
</template>

<script>
export default {
  data () {
    return {
      isEdit: false,
      actions: ['Squat', 'Deadlift', 'BenchPress'],
      headers: [
        {
          text: 'Expected Weight',
          value: 'expectedWeight'
        },
        {
          text: 'Weight Recorded',
          value: 'weightRecorded'
        },
        {
          text: 'Expected Rep',
          value: 'expectedRep'
        },
        {
          text: 'Rep Recorded',
          value: 'repRecorded'
        },
        {
          text: 'Actions',
          value: 'actions'
        }
      ],
      records: {
        Squat: [
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '3(-2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '87KG(+2.5)',
            expectedRep: '5',
            repRecorded: '7(+2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '5'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '3(-2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '87KG(+2.5)',
            expectedRep: '5',
            repRecorded: '7(+2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '5'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '3(-2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '87KG(+2.5)',
            expectedRep: '5',
            repRecorded: '7(+2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '5'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '3(-2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '87KG(+2.5)',
            expectedRep: '5',
            repRecorded: '7(+2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '5'
          }
        ],
        Deadlift: [
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '3(-2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '87KG(+2.5)',
            expectedRep: '5',
            repRecorded: '7(+2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '5'
          }
        ],
        BenchPress: [
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '3(-2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '87KG(+2.5)',
            expectedRep: '5',
            repRecorded: '7(+2)'
          },
          {
            expectedWeight: '85KG',
            weightRecorded: '82KG(-3)',
            expectedRep: '5',
            repRecorded: '5'
          }
        ]
      }
    }
  },
  methods: {
    onSave () {
      // save data to db
      this.isEdit = false
    },
    onClick (isEdit) {
      this.isEdit = isEdit
    }
  },
  computed: {
    aaa () {
      return '123'
    }
  }
}
</script>