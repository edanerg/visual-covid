<template>
<div>
    <svg id="runChart" class="runChart"></svg>
    <p v-if="type=='confirmed'">Total Confirmed Cases</p>
    <p v-else-if="type=='death'">Total Death</p>
    <p v-else-if="type=='recovered'">Total Recovered</p>

    <v-select
    v-model="type"
    item-text="text"
    item-value="value"
    :items="[{text: 'Total Confirmed Cases', value: 'confirmed'},
             {text: 'Total Death', value: 'death'},
             {text: 'Total Recovered', value: 'recovered'}]"
    label="Data Type"
    >
    </v-select>
</div>
</template>


<script>
import * as d3 from "d3"
import config from '../config.js'
import dp from '../services/data-process.js'

class BarChart {
    constructor(svg) {
        this.svg = svg
    }

    build(options) {
        this.clean()
        setTimeout(() => {
            this.options = options
            this.buildScales()
            this.buildFormats()
            this.keyframes = dp.getAnimationFrames(this.options)
            this.buildKeyframeGenerator()
            this.buildComponents()
            this.animate()
        }, options.duration)
    }

    clean() {
        if (this.svg) {
            this.play = false
            this.svg.selectAll("*").interrupt()
            this.svg.selectAll("*").remove()
        }
    }

    buildKeyframeGenerator() {
        const keyframes = this.keyframes
        function* keyGen() {
            for (let keyframe of keyframes) {
                yield keyframe
            }
        }
        this.keyGen = keyGen
    }


    async showFirstFrame() {
        const svg = this.svg
        const animation = this.animation
        const keyframes = this.keyframes
        const {x} = this.scales
        const {duration} = this.options
        const keyframe = keyframes[0]
        const transition = svg.transition()
                                .duration(duration)
                                .ease(d3.easeLinear)
        const top = keyframe.top[0]
        x.domain([0, keyframe.values[top].value])
        animation(keyframe, transition)
        await transition.end()
    }

    async showLastFrame() {
        const svg = this.svg
        const animation = this.animation
        const keyframes = this.keyframes
        const {x} = this.scales
        const {duration} = this.options
        const keyframe = keyframes[keyframes.length - 1]
        const transition = svg.transition()
                                .duration(duration)
                                .ease(d3.easeLinear)
        const top = keyframe.top[0]
        x.domain([0, keyframe.values[top].value])
        animation(keyframe, transition)
        await transition.end()
    }

    animate() {
        this.play = true
        this.animation()
    }

    async loadData(filename, preprocess) {
        let data = await d3.csv(filename)
        this.data = preprocess(data)
    }

    buildScales() {
        const {width, n, margin, barSize} = this.options
        const scale = d3.scaleOrdinal(d3.schemePaired)
        const color = d => scale(d)
        const x = d3.scaleLinear([0, 1], [margin.left, width-margin.right])
        const y = d3.scaleBand().domain(d3.range(n + 1)).rangeRound([margin.top, barSize * (n + 1 + 0.1)]).padding(0.1)
        this.scales = {x, y, color}
    }


    buildFormats() {
        const formatDate = d3.utcFormat("%m-%d")
        const formatNumber = d3.format(",d")
        const textTween = (a, b) => {
            const interpolator = d3.interpolateNumber(a, b)
            return function(t) {
                this.textContent = formatNumber(interpolator(t));
            }
        }
        this.formats = {formatDate, formatNumber, textTween}
    }


    buildComponents() {
        var barAnimation, labelsAnimation, axisAnimation, tickerAnimation, numberAnimation
        const svg = this.svg
        const {width, hight, barSize, margin, n, k, duration} = this.options
        const {x, y, color} = this.scales
        const {formatDate, formatNumber, textTween} = this.formats
        const keyframes = this.keyframes
        const keyGen = this.keyGen

        var bar = svg.append("g")
                    .attr("fill-opacity", 0.6)
                    .selectAll("rect")
        var label = svg.append("g")
                    .style("font-size", "12px")
                    .attr("text-anchor", "end")
                    .selectAll("text")
        var number = svg.append("g")
                        .style("font-size", "12px")
                        .attr("text-anchor", "start")
                        .selectAll("text")
        var g = svg.append("g")
                    .attr("transform", `translate(0,${margin.top})`)
    
        var axis = d3.axisTop(x)
                    .ticks(width / 160)
                    .tickSizeOuter(0)
                    .tickSizeInner(-barSize * (n + y.padding()))

        var now = svg.append("text")
                        .text(formatDate(keyframes[0].date))
                        .style("font-size", "20px")
                        .style("font-weight", 500)
                        .attr("text-anchor", "end")
                        .attr("x", width - 6)
                        .attr("y", margin.top + barSize * (n - 1))
                        .attr("dy", "0.32em")
        this.components = {bar, label, number, g, axis, now}


        barAnimation = ({date, values, top, prev, next}, transition) => bar = bar
        .data(top, d => d)
        .join(
            enter => enter.append("rect")
                            .attr("fill", color)
                            .attr("height", y.bandwidth())
                            .attr("x", x(0))
                            .attr("y", d => y(prev[d].rank))
                            .attr("width", d => x(prev[d].value) - x(0)),
            update => update,
            exit => exit.transition(transition).remove()
                        .attr("y", d => y(next[d].rank))
                        .attr("width", d => x(next[d].value) - x(0))
        )
        .call(bar => bar.transition(transition)
                        .attr("y", d => y(values[d].rank))
                        .attr("width", d => x(values[d].value) - x(0)))



        labelsAnimation = ({date, values, top, prev, next}, transition) => label = label
        .data(top, d => d)
        .join(
        enter => enter.append("text")
            .attr("transform", d => `translate(0,${y((prev[d].rank))})`)
            .attr("y", y.bandwidth() * 3 / 4)
            .attr("x", margin.left - 10)
            .attr("dy", "-0.25em")
            .text(d => d),
        update => update,
        exit => exit.transition(transition).remove()
            .attr("transform", d => `translate(0,${y(next[d].rank)})`)
            .call(g => g.select("tspan")
                        .tween("text", d => textTween(values[d].value, next[d].value)))
        )
        .call(lb => lb.transition(transition)
                        .attr("transform", d => `translate(0,${y((values[d]).rank)})`)
                        .call(g => g.select("tspan")
                                    .tween("text", d => textTween(prev[d].value, values[d].value))))


        numberAnimation = ({date, values, top, prev, next}, transition) => number = number
        .data(top, d => d)
        .join(
        enter => enter.append("text")
                        .attr("transform", d => `translate(${x((prev[d].value))},${y((prev[d].rank))})`)
                        .attr("y", y.bandwidth() * 3 / 4)
                        .attr("x", 6)
                        .attr("dy", "-0.25em")
                        .text(d => prev[d].value),
        update => update,
        exit => exit.transition(transition).remove()
            .attr("transform", d => `translate(${x((prev[d].value))},${y(next[d].rank)})`)
            .call(g => g.tween("text", d => textTween(values[d].value, next[d].value)))
        )
        .call(nb => nb.transition(transition)
                        .attr("transform", d => `translate(${x((values[d].value))},${y((values[d]).rank)})`)
                        .call(g => g.tween("text", d => textTween(prev[d].value, values[d].value))))


        axisAnimation = (_, transition) => {
            g.transition(transition).call(axis)
            g.select(".tick:first-of-type text").remove()
            g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "lightgrey").attr("stroke-dasharray", "5,5")
            g.select(".domain").remove()
        }

        tickerAnimation = ({date}, transition) => {transition.end().then(() => now.text(formatDate(date)))}

        const kg = keyGen()
        const animation = () => {
            const nxt = kg.next()
            if (this.play && !nxt.done) {
                const transition = d3.transition().duration(duration).ease(d3.easeLinear).on("end", animation)

                const keyframe = nxt.value
                const top = keyframe.top[0]
                x.domain([0, keyframe.values[top].value])

                barAnimation(keyframe, transition)
                labelsAnimation(keyframe, transition)
                numberAnimation(keyframe, transition)
                axisAnimation(keyframe, transition)
                tickerAnimation(keyframe, transition)
            }
        }
        this.animation = animation
    }
}


var chart
export default {
    beforeDestroy: function() {
        chart.clean()
    },
    watch: {
        type: function() {
            const options = {width: 1000, height: 600, barSize: 30, n: 15, k: 5, type: this.type, duration: 250, margin: {top: 16, right: 100, bottom: 6, left: 150}}
            chart.build(options)
        }
    },
    mounted: async function() {
        const svg = d3.select("#runChart")
                      .attr("viewBox", [0, 0, 1000, 450])
        const options = {width: 1000, height: 600, barSize: 30, n: 15, k: 5, type: this.type, duration: 250, margin: {top: 16, right: 100, bottom: 6, left: 150}}
        chart = new BarChart(svg)
        chart.build(options)
    },
    data: function () {
        return {
            type: "confirmed"
        }
    }
}
</script>