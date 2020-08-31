<template>
    <div>
        <svg id="lineChart"></svg>
         <p v-if="value=='confirmed'">Total Confirmed Cases</p>
        <p v-else-if="value=='death'">Total Death</p>
        <p v-else-if="value=='recovered'">Total Recovered</p>
        <v-select
        v-model="countries"
        persistent-hint
        hint="Compare with Other Countries"
        multiple
        label="Add Countries"
        :menu-props="{ maxHeight: '300' }"
        :items="countryNames"
        >
        </v-select>
        <v-select
        v-model="value"
        label="Data Type"
        item-text="text"
        item-value="value"
        :items="[{text: 'Total Confirmed Cases', value: 'confirmed'},
                {text: 'Total Death', value: 'death'},
                {text: 'Total Recovered', value: 'recovered'}]"
        >
        </v-select>
    </div>
</template>



<script>
import * as d3 from 'd3'
import dp from '../services/data-process.js'
import { interpolatePath } from 'd3-interpolate-path'

class LineChart {
    constructor(svg) {
        this.svg = svg
    }

    build(options) {
        this.clean()
        this.options = options
        this.data = dp.getCountryData(options.countries, options.value)
        if (options['animation']) {
            this.options['n'] = 30
            this.options['duration'] = 200
            this.buildAnimationScales()
            this.buildAnimationComponents()
            this.animate()
        } else {
            this.buildStaticScales()
            this.buildStaticComponents()
        }
    }

    buildStaticScales() {
        const data = this.data
        const {margin, width, height} = this.options

        const x = d3.scaleTime()
                    .domain(d3.extent(data, d => d[0]))
                    .range([margin.left, width - margin.right])
        const y = d3.scaleLinear()
                    .domain([0, d3.max(data, d => d3.max(Object.values(d[1])))]).nice()
                    .range([height - margin.bottom, margin.top])
        const color = d3.scaleLinear()
                        .domain([0, Object.keys(data[0][1]).length])
                        .range(["steelblue", "red"])
        this.scales = {x, y, color}
    }

    buildAnimationScales() {
        const data = this.data
        const {margin, width, height, n} = this.options

        const x = d3.scaleTime()
                    // .domain([data[0][0], data[0][0]])
                    // .range([margin.left, margin.left])
                    .domain([data[0][0], data[n][0]])
                    .range([margin.left, width - margin.right])
        const y = d3.scaleLinear()
                    .domain([0, d3.max(data.slice(0, n+1), d => d3.max(Object.values(d[1])))])
                    .range([height - margin.bottom, margin.top])
        const color = d3.scaleLinear()
                        .domain([0, Object.keys(data[0][1]).length])
                        .range(["steelblue", "red"])
        this.scales = {x, y, color}
    }


    buildStaticComponents() {
        const data = this.data
        const svg = this.svg
        const {x, y, color} = this.scales
        const {margin, width, height} = this.options

        const xAxis = svg.append("g")
                        .attr("transform", `translate(0,${height - margin.bottom})`)
        const yAxis = svg.append("g")
                         .attr("transform", `translate(${margin.left},0)`)
        const xAxisAnimation = g => g.call(d3.axisBottom(x)
                                             .ticks(width / 80, d3.utcFormat("%m-%d"))
                                             .tickSizeOuter(0))
        const yAxisAnimation = g => g.call(d3.axisLeft(y))
        
        xAxis.call(xAxisAnimation)
        yAxis.call(yAxisAnimation)

        
        function tweenDash() {
            const l = this.getTotalLength(), i = d3.interpolateString("0," + l, l + "," + l)
            return function(t) { return i(t) }
        }

        const countries = Object.keys(data[0][1])
        const lastData = data[data.length-1]
        for (let i = 0; i < countries.length; i++) {
            const c = countries[i]
            const line = d3.line()
                            .x(d => x(d[0]))
                            .y(d => y(d[1][c]))
            const name = svg.append("g")
                            .attr("transform", "translate(" + (x(lastData[0])) + "," + y(lastData[1][c]) + ")")
                            .attr("text-anchor", "end")
                            .append("text")
                            .attr("opacity", 0)
                            .text(c)
            svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", color(i))
                .attr("stroke-width", 2)
                .attr("d", line)
                .transition()
                    .duration(data.length * 10)
                    .attrTween("stroke-dasharray", tweenDash)
                    .on("end", () => {
                        name.transition()
                                .duration(100)
                                .attr("opacity", 1)
                        })
        }
    }

    async buildAnimationComponents() {
        const data = this.data
        const svg = this.svg
        const {x, y, color} = this.scales
        const {margin, width, height, n, duration} = this.options

        const xAxis = svg.append("g")
                        .attr("transform", `translate(0,${height - margin.bottom})`)

        const yAxis = svg.append("g")
                         .attr("transform", `translate(${margin.left},0)`)
        const clipPath = svg.append("g")
        const xAxisAnimation = g => g.call(d3.axisBottom(x)
                                             .ticks(width / 80, d3.utcFormat("%m-%d"))
                                             .tickSizeOuter(0))
        const yAxisAnimation = g => g.call(d3.axisLeft(y))

        xAxis.call(xAxisAnimation)
        yAxis.call(yAxisAnimation)
        const rect = clipPath.append("defs")
                            .append("clipPath")
                            .attr("id", "clip")
                            .append("rect")
                            .attr("transform", `translate(${margin.left}, ${margin.top})`)
                            .attr("height", height - margin.bottom - margin.top)
                            // .attr("width", width - margin.right - margin.left)
        const pathG = clipPath.append("g")
                            .attr("clip-path", "url(#clip)")

        const countries = Object.keys(data[0][1])
        const paths = []
        for (let i = 0; i < countries.length; i++) {
            const c = countries[i]
            const line = d3.line()
                            // .curve(d3.curveNatural)
                            // .defined(d => d[0] >= x.domain()[0] && d[0] <= x.domain()[1])
                            .x(d => x(d[0]))
                            .y(d => y(d[1][c]))
            const path = pathG.append("path")
                                .datum(data)
                                .attr("fill", "none")
                                .attr("stroke", color(i))
                                .attr("stroke-width", 2)
                                .attr("d", line)
            const name = svg.append("g")
                            .append("text")
                            .attr("transform", "translate(" + (x(data[0][0])) + "," + y(data[0][1][c]) + ")")
                            .attr("text-anchor", "end")
                            .text(c)
            paths.push([path, line, name, c, 0])
        }


        const axisAnimation = () => {
            xAxis.transition()
                 .duration(duration)
                 .ease(d3.easeLinear)
                 .call(xAxisAnimation)
            yAxis.transition()
                 .duration(duration)
                 .ease(d3.easeLinear)
                 .call(yAxisAnimation)
        }

        const secondAnimation = () => {
            const idx = {}
            const idx2 = {}
            for (let path of paths) {
                const c = path[3]
                idx[c] = 0
                idx2[c] = 0
                path[0].transition()
                        .on("start", function repeat() {
                            if (idx[c] + n < data.length) {
                                const i = idx[c]
                                const ytop = d3.max(Object.values(data[i+n][1]))
                                if (ytop > y.domain()[1]) {
                                    y.domain([0, ytop])
                                }
                                x.domain([data[i][0], data[i+n][0]])

                                axisAnimation()
                                d3.active(this)
                                    .duration(duration)
                                    .ease(d3.easeLinear)
                                    .attrTween("d", function (d) {
                                        var previous = d3.select(this).attr('d')
                                        var current = path[1](d)
                                        return interpolatePath(previous, current)
                                    })
                                    .transition()
                                    .on("start", repeat)
                                idx[c]++
                            }
                        })

                path[2].transition()
                        .on("start", function repeat2() {
                            if (idx2[c] + n < data.length) {
                                const i = idx2[c]
                                d3.active(this)
                                    .duration(duration)
                                    .ease(d3.easeLinear)
                                .attr("transform", `translate(${x.range()[1]}, ${y(data[i+n][1][c])})`)
                                .transition()
                                .on("start", repeat2)
                                idx2[c]++
                            }
                        })
            }
        }


        const animation = () => {
            rect.transition()
                .duration(duration * n)
                .ease(d3.easeLinear)
                .attr("width", (width - margin.right - margin.left))
                .on("end", secondAnimation)

            const idx = {}
            for (let path of paths) {
                const c = path[3]
                idx[c] = 1
                path[2].transition()
                        .on("start", function repeat() {
                            if (idx[c] <= n) {
                                const i = idx[c]
                                d3.active(this)
                                  .duration(duration)
                                  .ease(d3.easeLinear)
                                    .attr("transform", `translate(${x(data[i][0])},${y(data[i][1][path[3]])})` )
                                  .transition()
                                  .on("start", repeat)
                                idx[c]++
                            }
                        })
            }
        }
        this.animation = animation
    }

    clean() {
        if (this.svg) {
            this.svg.selectAll("*").interrupt()
            this.svg.selectAll("*").remove()
        }
    }

    animate() {
        const animation = this.animation
        animation()
    }

}


var lineChart

export default {
    props: {
        defaultCountry: {type: String, default: "Italy"},
        animation: {type: Boolean, default: false}
    },
    beforeDestroy: function() {
        lineChart.clean()
    },
    watch: {
        defaultCountry: function(newOne, oldOne) {
            this.countries = [newOne]
        }
    },
    updated: function() {
        lineChart.build({countries: this.countries,
                        value: this.value,
                        animation: this.animation,
                        margin: {top:20, right:30, bottom:30, left:60},
                        n: 30,
                        duration: 200,
                        height: 500,
                        width: 1000})
    },
    mounted: function() {
        lineChart = new LineChart(d3.select("#lineChart")
                                    .attr("viewBox", [0,0,1000,500]))
        lineChart.build({countries: this.countries,
                        value: this.value,
                        animation: this.animation,
                        margin: {top:20, right:30, bottom:30, left:60},
                        n: 30,
                        duration: 200,
                        height: 500,
                        width: 1000})
    },
    data: function() {
        return {
            countries: [this.defaultCountry],
            value: "confirmed",
            countryNames: dp.getAllCountryNames()
        }
    },
    methods: {
        animate: function() {
            lineChart.animate()
        }
    }
}
</script>