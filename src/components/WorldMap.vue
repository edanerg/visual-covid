<template>
<div>
    <svg id="worldMap" class="worldMap"></svg>
    <p v-if="dataType=='confirmed'">Total Confirmed Cases</p>
    <p v-else-if="dataType=='death'">Total Death</p>
    <p v-else-if="dataType=='recovered'">Total Recovered</p>

    <v-select
        v-model="dataType"
        item-text="text"
        item-value="value"
        :items="[{text: 'Total Confirmed Cases', value: 'confirmed'},
                {text: 'Total Death', value: 'death'},
                {text: 'Total Recovered', value: 'recovered'}]"
        label="Data Type"
    ></v-select>
</div>
</template>



<script>
import * as d3 from 'd3'
import config from '../config.js'
import * as topojson from 'topojson'
import dp from '../services/data-process.js'

class WorldMap {
    constructor(svg) {
        this.svg = svg
    }

    async build(options) {
        this.clean()
        this.options = options
        this.world = await dp.getTopoData()
        this.data = dp.getTimeSeriesData(options.type)
        this.buildScales()
        if (this.options['animation']) {
            this.buildTopo()
            this.buildLegends()
            this.animate()
        } else {
            this.buildTopo()
            this.buildLegends()
            this.staticAnimate()
        }
    }

    buildScales() {
        const data = this.data
        const lastFrame = data[data.length-1]
        const maxScale = Math.ceil(Math.log10(d3.max(Object.values(lastFrame[1]))))

        const colorScale = d3.scaleLog().domain([1, Math.pow(10, maxScale)]).range(["steelblue", "black"])
        this.scales = {colorScale}
        this.maxScale = maxScale
    }

    buildTopo() {
        const world = this.world
        const svg = this.svg
        // const projection = d3.geoOrthographic()
        const projection = d3.geoNaturalEarth1()
        const {margin} = this.options
        var path = d3.geoPath().projection(projection)


        const countries = topojson.feature(world, world.objects.countries)
        const outline = {type: "Sphere"}
        const graticule = d3.geoGraticule10()
        const g = svg.append("g").attr("transform", `translate(${margin.left}, 0)`)

        g.append("path")
           .attr("class", "graticule")
           .attr("d", path(graticule))
           .attr("fill", "none")
           .attr("stroke", "#ccc")

        g.selectAll("path.feature")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("id", d => d.properties.countryCode || d.properties.name)
            .attr("class", "country")
            .attr("d", path)

        g.append("path")
           .attr("class", "outline")
           .attr("d", path(outline))
           .attr("fill", "none")
           .attr("stroke", "#000")
    }

    buildLegends() {
        const data = this.data
        const svg = this.svg
        const {colorScale} = this.scales
        const maxScale = this.maxScale
        const {legendSize, width, height, margin} = this.options

        const currentDate = svg.append("g")
                                .attr("transform", `translate(${width/2}, ${height - 30})`)
                                .append("text")
        const legends = svg.append("g")
                           .attr("transform", `translate(0, ${height - 60 - maxScale * (legendSize + 5)})`)
        
        const cols = []
        for (let i = 0; i <= maxScale; i++) {
            cols.push(Math.pow(10, i))
        }

        legends.selectAll("rects")
               .data(cols)
               .enter()
               .append("rect")
               .attr("x", 0)
               .attr("y", (d, i) => i * (legendSize + 5))
               .attr("width", legendSize)
               .attr("height", legendSize)
               .style("fill", d => colorScale(d))

        legends.selectAll("texts")
               .data(cols)
               .enter()
               .append("text")
               .attr("x", legendSize * 1.2)
               .attr("y", (d, i) => (i+0.5) * (legendSize + 5))
               .text(d => d)
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle")
        this.legends = {legends, currentDate}
    }


    staticAnimate() {
        const data = this.data
        const svg = this.svg
        const {colorScale} = this.scales
        const {currentDate} = this.legends
        const lastFrame = data[data.length-1]

        currentDate.text(d3.utcFormat("%m-%d")(lastFrame[0]))
        for (let c in lastFrame[1]) {
            svg.select("#" + dp.getCountryCode(c))
                .transition()
                .duration(1000)
                .style("fill", colorScale(d3.max([lastFrame[1][c],1])))
        }
    }

    async animate() {
        const data = this.data
        const svg = this.svg
        const {colorScale} = this.scales
        const {currentDate} = this.legends

        let i = {}
        let x = 0
        currentDate.transition()
                    .on("start", function repeateText() {
                        if (x < data.length) {
                            d3.active(this)
                              .ease(d3.easeLinear)
                              .duration(200)
                              .text(d3.utcFormat("%m-%d")(data[x][0]))
                              .transition()
                              .on("start", repeateText)
                            x += 1
                        }
                    })
        for (let c in data[0][1]) {
            i[c] = 0
            svg.select("#" + dp.getCountryCode(c))
                .transition()
                .on("start", function repeate() {
                    if (i[c] < data.length) {
                        d3.active(this)
                            .ease(d3.easeLinear)
                            .duration(200)
                            .style("fill", colorScale(d3.max([data[i[c]][1][c], 1])))
                            .transition()
                            .on("start", repeate)
                        i[c] += 1
                    }
                })
        }
    }


    clean() {
        if (this.svg) {
            this.svg.selectAll("*").interrupt()
            this.svg.selectAll("*").remove()
        }
    }
}

var worldMap = new WorldMap()

export default {
    props: {
        animation: Boolean
    },
    watch: {
        dataType: function(newDataType, oldDataType) {
            worldMap.build({animation: this.animation,
                            type: this.dataType,
                            legendSize: 20,
                            duration: 200,
                            width: 1000,
                            height: 600,
                            margin: {left: 30}})
        }
    },
    data: function () {
        return {
            dataType: "confirmed"
        }
    },
    beforeDestroy: function () {
        worldMap.clean()
    },
    mounted: function () {
        const svg = d3.select("#worldMap")
                      .attr("width", 1000).attr("height", 600)
                    //   .attr("viewBox", [0,0,1000,600])
        worldMap = new WorldMap(svg)
        worldMap.build({animation: this.animation,
                        type: this.dataType,
                        legendSize: 20,
                        duration: 200,
                        width: 1000,
                        height: 600,
                        margin: {left: 30}})
    },
    methods: {
        animate: function () {
            worldMap.animate()
        }
    }
}
</script>


<style>
.country {
    fill: steelblue;
    stroke: #eee;
    stroke-width: 0.2;
}
</style>