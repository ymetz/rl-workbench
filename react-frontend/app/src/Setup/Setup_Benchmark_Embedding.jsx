import React, { PureComponent } from 'react';
import { Button, Form } from 'react-bootstrap';
import '../css/Setup.module.css';
import * as d3 from 'd3';
import axios from 'axios';

export default class Setup_Benchmark_Embedding extends PureComponent {
    constructor(props) {
        super(props);
        this.embeddingRef = React.createRef();

        this.state = {
            data_timestamp: 0,
            sequence_length: 1,
            draw_lasso: false,
            color_scale: undefined,
        };
    }

    changeSequenceSlider(event) {
        const seq_length = event.target.value;
        this.setState({ sequence_length: seq_length });
    }

    loadData() {
        const new_color_scale = d3
            .scaleSequential(d3.interpolateOranges)
            .domain(d3.extent(this.props.currentRewardData));
        axios.post('/routing/current_obs_to_embedding?sequence_length=' + this.state.sequence_length).then((res) => {
            const data = res.data;
            this.setState(
                { data_timestamp: this.props.timeStamp, color_scale: new_color_scale },
                this.drawChart(
                    data.embedding,
                    this.props.selectDatapoint,
                    this.props.currentRewardData,
                    this.props.currentDoneData,
                    new_color_scale
                )
            );
        });
    }

    splitArray(arr, indices) {
        var result = [];
        var lastIndex = 0;
        for (var i = 0; i < indices.length; i++) {
            result.push(arr.slice(lastIndex, indices[i]));
            lastIndex = indices[i];
        }
        result.push(arr.slice(lastIndex));
        return result;
    }

    updateChartColors(currentSteps, rewardData, colorScale) {
        const svg = d3.select(this.embeddingRef.current.current);
        const circles = svg.selectAll('circle');
        circles.attr('fill', (d, i) => colorScale(rewardData[d[2]])).attr('r', 5);
        svg.select('#datapoint_' + currentSteps.value)
            .attr('fill', '#ff4d00')
            .attr('r', 7)
            .raise();
    }

    componentDidUpdate() {
        this.updateChartColors(this.props.currentSteps, this.props.currentRewardData, this.state.color_scale);
    }

    drawChart(data, selectDatapoint, rewardData, doneData, colorScale) {
        const margin = { top: 0, right: 0, bottom: 0, left: 0 };
        const done_idx = doneData.reduce((a, elem, i) => (elem === true && a.push(i), a), []);
        d3.select(tthis.embeddingRef.current.current).select('*').remove();
        const svgWidth = this.embeddingRef.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = this.embeddingRef.current.parentElement.clientHeight - margin.top - margin.bottom;
        if (svgWidth < 0 || svgHeight < 0) return;

        const svg = d3
            .select(this.embeddingRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const x = d3
            .scaleLinear()
            .domain([d3.max(data.map((d) => d[0])), d3.min(data.map((d) => d[0]))])
            .range([0, svgWidth]);
        const xAxis = d3
            .axisBottom(x)
            .ticks(((svgWidth + 2) / (svgHeight + 2)) * 5)
            .tickSize(svgHeight)
            .tickPadding(8 - svgHeight);

        const y = d3
            .scaleLinear()
            .range([svgHeight, 0])
            .domain([d3.max(data.map((d) => d[1])), d3.min(data.map((d) => d[1]))]);
        const yAxis = d3
            .axisRight(y)
            .ticks(5)
            .tickSize(svgWidth)
            .tickPadding(8 - svgWidth);

        const zoom = d3
            .zoom()
            .scaleExtent([0.5, 40])
            .translateExtent([
                [-150, -150],
                [svgWidth + 150, svgHeight + 150],
            ])
            .on('zoom', zoomed);

        const gX = svg.append('g').attr('class', 'axis-embed axis--x').call(xAxis);

        const gY = svg.append('g').attr('class', 'axis-embed axis--y').call(yAxis);

        const view = svg.append('g');

        view.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', svgHeight)
            .attr('width', svgWidth)
            .style('opacity', '0');

        const lineFunction = d3
            .line()
            .x(function (d) {
                return x(d[0]);
            })
            .y(function (d) {
                return y(d[1]);
            });

        // Compute stroke outline for segment p12.
        const lineJoin = function (p0, p1, p2, p3, width) {
            var u12 = perp(p1, p2),
                r = width / 2,
                a = [p1[0] + u12[0] * r, p1[1] + u12[1] * r],
                b = [p2[0] + u12[0] * r, p2[1] + u12[1] * r],
                c = [p2[0] - u12[0] * r, p2[1] - u12[1] * r],
                d = [p1[0] - u12[0] * r, p1[1] - u12[1] * r];

            if (p0) {
                // clip ad and dc using average of u01 and u12
                var u01 = perp(p0, p1),
                    e = [p1[0] + u01[0] + u12[0], p1[1] + u01[1] + u12[1]];
                a = lineIntersect(p1, e, a, b);
                d = lineIntersect(p1, e, d, c);
            }

            if (p3) {
                // clip ab and dc using average of u12 and u23
                var u23 = perp(p2, p3),
                    e = [p2[0] + u23[0] + u12[0], p2[1] + u23[1] + u12[1]];
                b = lineIntersect(p2, e, a, b);
                c = lineIntersect(p2, e, d, c);
            }

            return 'M' + a + 'L' + b + ' ' + c + ' ' + d + 'Z';
        };

        // Compute intersection of two infinite lines ab and cd.
        const lineIntersect = function (a, b, c, d) {
            var x1 = c[0],
                x3 = a[0],
                x21 = d[0] - x1,
                x43 = b[0] - x3,
                y1 = c[1],
                y3 = a[1],
                y21 = d[1] - y1,
                y43 = b[1] - y3,
                ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
            return [x1 + ua * x21, y1 + ua * y21];
        };

        // Compute unit vector perpendicular to p01.
        const perp = function (p0, p1) {
            var u01x = p0[1] - p1[1],
                u01y = p1[0] - p0[0],
                u01d = Math.sqrt(u01x * u01x + u01y * u01y);
            return [u01x / u01d, u01y / u01d];
        };

        // Sample the SVG path uniformly with the specified precision.
        const samples = function (path, precision) {
            var n = path.getTotalLength(),
                t = [0],
                i = 0,
                dt = precision;
            if (n == 0) return null;
            while ((i += dt) < n) t.push(i);
            t.push(n);
            return t.map(function (t) {
                var p = path.getPointAtLength(t),
                    a = [p.x, p.y];
                a.t = t / n;
                return a;
            });
        };

        // Compute quads of adjacent points [p0, p1, p2, p3].
        const quads = function (points) {
            if (points == null) return [];
            return d3.range(points.length - 1).map(function (i) {
                var a = [points[i - 1], points[i], points[i + 1], points[i + 2]];
                a.t = (points[i][2] + points[i + 1][2]) / 2;
                return a;
            });
        };

        const splitData = this.splitArray(data, done_idx);

        const paths = view.selectAll('g').data(splitData).enter().append('g').attr('class', 'path_group');

        const thePath = paths
            .append('path')
            .attr('class', 'state_path')
            .style('fill', 'none')
            .style('stroke-width', 2)
            .style('stroke', (d, i) => d3.interpolateSpectral(i / splitData.length))
            .datum((d) => d.filter((d, i) => true).map((d, i) => [d[0], d[1], i]))
            .attr('d', lineFunction);

        /*let path_data = quads(samples(thePath.node(), 4));
        
        paths.selectAll("path")
            .data(path_data, function (d) { return d; })
            .enter().append("path")
            .attr("class", "state_path")
            .style("stroke", function (d,i) { return d3.interpolateSpectral(i / path_data.length); })
            .attr("d", function (d) { return lineJoin(d[0], d[1], d[2], d[3], 0.5); });

        thePath.remove();*/

        view.append('g')
            .selectAll('circle')
            .data(data.map((d, i) => [d[0], d[1], i]))
            .enter()
            .append('circle')
            .attr('cx', (d) => x(d[0]))
            .attr('cy', (d) => y(d[1]))
            .attr('r', 5)
            .attr('stroke', 'black')
            .attr('opacity', 0.8)
            .attr('fill', (d) => colorScale(rewardData[d[2]]))
            .attr('id', (d) => 'datapoint_' + d[2])
            .on('click', circleClick);

        const lasso_start = function () {
            lasso
                .items()
                .attr('r', 5) // reset size
                .classed('not_possible', true)
                .classed('selected', false);
        };

        const lasso_draw = function () {
            lasso.possibleItems().classed('not_possible', false).classed('possible', true);

            lasso.notPossibleItems().classed('not_possible', true).classed('possible', false);
        };

        const lasso_end = function () {
            lasso.items().classed('not_possible', false).classed('possible', false);

            lasso.selectedItems().classed('selected', true).attr('r', 7);

            lasso.notSelectedItems().attr('r', 5);
        };

        // let lasso = d3.lasso()
        //     .closePathSelect(true)
        //     .closePathDistance(100)
        //     .items(circles)
        //     .targetArea(svg)
        //     .on("start", lasso_start)
        //     .on("draw", lasso_draw)
        //     .on("end", lasso_end);

        svg.call(zoom);

        //svg.call(lasso);

        function zoomed(event) {
            view.attr('transform', event.transform);
            gX.call(xAxis.scale(event.transform.rescaleX(x)));
            gY.call(yAxis.scale(event.transform.rescaleY(y)));
        }

        function circleClick(d) {
            selectDatapoint({ value: d[2] });
        }
    }

    render() {
        return (
            <div className="embedding_wrapper_div">
                <div ref={this.embeddingRef}></div>
                <div
                    className="embedding_overlay_div"
                    style={{
                        display:
                            this.props.timeStamp == 0 || this.state.data_timestamp !== this.props.timeStamp
                                ? 'inline'
                                : 'none',
                    }}
                >
                    <Button
                        variant="secondary"
                        className="embedding_data_button"
                        disabled={this.props.timeStamp == 0}
                        onClick={this.loadData.bind(this)}
                    >
                        Load Latent Space Embedding
                    </Button>
                    <p className="grey_text" style={{ padding: 50 }}>
                        The embedding is computed based on state similarity in the latent space of the model. Runs from
                        multiple models are projected into the common latent space of the most advanced model.
                    </p>
                    <p className="grey_text" style={{ padding: 50 }}>
                        Load UMAP embedding for benchmark steps. Note that this may take a while if the observation
                        space is large.
                    </p>
                    <div className="embedding_slider_div">
                        <Form.Group>
                            <Form.Control
                                type="range"
                                min="1"
                                max="10"
                                value={this.state.sequence_length}
                                id="sequence_length_range"
                                onChange={this.changeSequenceSlider.bind(this)}
                            />
                        </Form.Group>
                    </div>
                    <p className="grey_text">
                        Sequence Length {this.state.sequence_length}: Stack multiple steps for clustering
                    </p>
                </div>
            </div>
        );
    }
}
