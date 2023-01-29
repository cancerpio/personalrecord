<template>
  <v-app>
    <v-layout ref="app">
      <v-app-bar color="grey-lighten-2" name="app-bar" class="justify-center">
        <div class="d-flex justify-center align-center w-100">
          <v-btn @click="print('app-bar')">App Bar(上面)</v-btn>
        </div>
      </v-app-bar>
      <v-navigation-drawer color="grey-darken-2" permanent name="drawer">
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title class="text-h6"> Personal Record </v-list-item-title>
            <v-list-item-subtitle> beta </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
        <div class="nav-container">
          <div class="nav"><router-link to="/" >Programs</router-link></div>
          <div class="nav">
            <router-link to="/about">Records</router-link>
          </div>
        </div>
				<div class="nav-title">Program List</div>
				<v-list-item>
          <v-list-item-content>
            <v-list-item-title class="text-h8"> Linear_2021_March </v-list-item-title>
						<v-list-item-title class="text-h8"> Texas Method_2021_Apr </v-list-item-title>
						<v-list-item-title class="text-h8"> Conjugate_Method_2021_Apr </v-list-item-title> 
            <v-list-item-subtitle>  </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </v-navigation-drawer>
      <v-main>
        <v-card>
          <router-view> </router-view>
        </v-card>
      </v-main>
      <v-footer app>Foot(下面)</v-footer>
    </v-layout>
  </v-app>
</template>

<script setup>
import { ref } from "vue";

const theme = ref("light");

const onClick = () => { 
  theme.value = theme.value === "light" ? "dark" : "light";
};
</script>

<style scoped>
.nav-container {
  display: grid; 
  grid-template-columns: 50% 50%;
}
.nav {
  text-align: center;
  border: 1px solid gray;
  padding: 1px 1px 1px 1px;
}
.nav:hover {
  opacity: 0.6;
}
.nav-title {
  text-align: center;
	border: 1px solid gray;
	 padding: 1px 1px 1px 1px;
}
</style>