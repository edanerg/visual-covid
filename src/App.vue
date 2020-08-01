<template>
  <div id="app">
    <v-app>
      <v-navigation-drawer app permanent dark>
        <v-list>
          
            <v-list-item link>
                <v-list-item-content v-on:click="feedType = 'world'">
                    <v-list-item-title>World</v-list-item-title>
                </v-list-item-content>
            </v-list-item>


            <v-list-group>
                <template v-slot:activator>
                    <v-list-item-title>Country/Region</v-list-item-title>
                </template>
                <v-list-item v-for="country in countryNames" :key="country" link v-on:click="feedType = 'country'; selectedCountry = country;">
                    <v-list-item-title>{{country}}</v-list-item-title>
                </v-list-item>
            </v-list-group>

            <v-list-group>
                <template v-slot:activator>
                    <v-list-item-title>Animation</v-list-item-title>
                </template>
                <v-list-item link v-on:click="feedType = 'animation'; selectedAnimation='barChart'">
                    <v-list-item-title>Bar Chart</v-list-item-title>
                </v-list-item>
                <v-list-item link v-on:click="feedType = 'animation'; selectedAnimation='lineChart'">
                    <v-list-item-title>Line Chart</v-list-item-title>
                </v-list-item>
                <v-list-item link v-on:click="feedType = 'animation'; selectedAnimation='worldMap'">
                    <v-list-item-title>World Map</v-list-item-title>
                </v-list-item>
              </v-list-group>
        </v-list>
      </v-navigation-drawer>



      <v-main>
        <v-container fluid v-if="loaded">
          <div v-if="feedType=='world'">
            <WorldMap :key="'wm1'" :animation="false"></WorldMap>
            <Table :key="'t1'"></Table>
          </div>
          <div v-else-if="feedType=='country'">
            <LineChart :defaultCountry="selectedCountry" :key="'lc1'"></LineChart>
            <Table :key="'t2'" :type="selectedCountry"></Table>
          </div>
          <div v-if="feedType=='animation'">
            <BarChart v-if="selectedAnimation=='barChart'"></BarChart>
            <LineChart v-if="selectedAnimation=='lineChart'" :key="'lc2'" :animation="true"></LineChart>
            <WorldMap v-if="selectedAnimation=='worldMap'" :key="'wm2'" :animation="true"></WorldMap>
          </div>
        </v-container>
      </v-main>



    </v-app>
  </div>
</template>

<script>
import BarChart from './components/BarChart.vue'
import WorldMap from './components/WorldMap.vue'
import Table from './components/Table.vue'
import LineChart from './components/LineChart.vue'
import dp from './services/data-process.js'

export default {
  name: 'App',
  components: {
    BarChart,
    WorldMap,
    Table,
    LineChart
  },
  mounted: async function() {
    await dp.loadData()
    this.countryNames = dp.getAllCountryNames()
    this.loaded = true
  },
  data: function() {
    return {
      loaded: false,
      countryNames: [],
      feedType: "world",
      selectedCountry: "",
      selectedAnimation: ""
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
