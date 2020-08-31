<template>
    <v-card>
        <v-card-title>
            {{type=='global' ? 'Data by Country/Region': type}}
            <v-spacer></v-spacer>
            <v-text-field
                v-if="type=='global'"
                v-model="search"
                append-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
            ></v-text-field>
        </v-card-title>
        <v-data-table
        :headers="headers"
        :items="countryData"
        :sort-by="type=='global' ? ['confirmed'] : ['date']"
        :sort-desc="[true]"
        :items-per-page="countryData.length"
        :search="search"
        hide-default-footer
        >
            <template v-slot:item.date="{ item }">
                {{formatDate(item.date)}}
            </template>
            <template v-if="type=='global'" v-slot:item.confirmed="{ item }">
                <v-chip label :color="colorScale['confirmed'](item.confirmed+1)" dark>{{ item.confirmed }}</v-chip>
            </template>
            <template v-if="type=='global'" v-slot:item.death="{ item }">
                <v-chip label :color="colorScale['death'](item.death+1)" dark>{{ item.death }}</v-chip>
            </template>
            <template v-if="type=='global'" v-slot:item.recovered="{ item }">
                <v-chip label :color="colorScale['recovered'](item.recovered+1)" dark>{{ item.recovered }}</v-chip>
            </template>
        </v-data-table>
    </v-card>
</template>

<script>
import dp from '../services/data-process.js'
import * as d3 from 'd3'

export default {
    props: {
        type: {type: String, default: "global"}
    },
    computed: {
        countryData: function() {
            if (this.type == "global") {
                return dp.getCurrentData()
            } else {
                const countryName = this.type
                return dp.getCountryAllData(countryName)
            }
        },
        headers: function () {
            if (this.type == "global") {
                return [{text: "Country/Region", value: "name", align: "start", width: "300"},
                        {text: "confirmed", value: "confirmed", align: "start", sortable: true},
                        {text: "Death", value: "death", align: "start", sortable: true},
                        {text: "Recovered", value: "recovered", align: "start", sortable: true}]
            } else {
                return [{text: "Date", value: "date", align: "start", width: "300", sortable: true},
                        {text: "Total Confirmed Cases", value: "confirmed", align: "start", sortable: true},
                        {text: "Total Death", value: "death", align: "start", sortable: true},
                        {text: "Total Recovered", value: "recovered", align: "start", sortable: true}]
            }
        }

    },
    data: function() {
        return {
            search: '',
            colorScale: {
                confirmed: d3.scaleLog().domain([1, 10000000]).range(["rgb(196, 230, 255)", "rgb(0, 63, 110)"]),
                death: d3.scaleLog().domain([1, 1000000]).range(["rgb(196, 230, 255)", "rgb(0, 63, 110)"]),
                recovered: d3.scaleLog().domain([1, 10000000]).range(["rgb(196, 230, 255)", "rgb(0, 63, 110)"])
            }
        }
    },
    methods: {
        formatDate: function(date) {
            return d3.utcFormat("%m-%d")(new Date(date))
        }
    }
}
</script>