import React, { PureComponent } from 'react';
import { Button, Form, Collapse } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { legend } from '../Common/Color_Legend';
import * as d3 from 'd3';
import * as d3Lasso from 'd3-lasso';
import axios from 'axios';

export default class Evaluation_Embedding extends PureComponent {
    lasso = null;

    constructor(props) {
        super(props);
        this.embeddingRef = React.createRef();
        this.colorLegendRef = React.createRef();

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

    changeStateValue(event) {
        const name = event.target.name;
        const value = event.target.value;
        this.setState({ [name]: value });
    }

    loadData() {
        const new_color_scale = d3.scaleSequential(d3.interpolateOrRd).domain(d3.extent(this.props.currentRewardData));
        const use_latent_features = this.props.useLatentFeature ? 1 : 0;
        const embedding_method = this.props.embeddingMethod;
        // If no 2d embedding is selected, only return a one-D embedding (i.e. one component)
        const use_one_d_embedding = this.props.embeddingAxisOption !== '2D embedding' ? 1 : 0;
        const reproject = this.props.reproject ? 1 : 0;
        axios
            .post(
                '/routing/current_obs_to_embedding?sequence_length=' +
                    this.state.sequence_length +
                    '&use_latent_features=' +
                    use_latent_features +
                    '&embedding_method=' +
                    embedding_method +
                    '&reproject=' +
                    reproject +
                    '&reproject_env_id=' +
                    this.props.selectedEnv +
                    '&use_one_d_embedding=' +
                    use_one_d_embedding +
                    '&reproject_exp_id=' +
                    this.props.selectedExp +
                    '&reproject_checkpoint_step=' +
                    this.props.selectedCheckpoint,
                this.props.embeddingSettings
            )
            .then((res) => {
                const data = res.data;
                this.setState(
                    { data_timestamp: this.props.timeStamp, color_scale: new_color_scale },
                    this.drawChart(
                        data.embedding,
                        this.props.selectDatapoint,
                        this.props.currentRewardData,
                        this.props.currentDoneData,
                        new_color_scale,
                        this.props.highlightedEpisodes
                    )
                );
            });
    }

    splitArray(arr, indices) {
        var result = [];
        var lastIndex = 0;
        for (var i = 0; i < indices.length; i++) {
            // Note that the last observations of an episode is already from the next episode (i.e. the one give the done flag, so omit drawing the path)
            result.push(arr.slice(lastIndex, indices[i]));
            lastIndex = indices[i] + 1;
        }
        result.push(arr.slice(Math.min(lastIndex, arr.length - 1)));
        return result;
    }

    updateChartColors(currentSteps, rewardData, colorScale) {
        const svg = d3.select(this.embeddingRef.current.current);
        const circles = svg.selectAll('circle');
        if (circles === null) {
            return;
        }
        circles.attr('fill', (d, i) => colorScale(rewardData[d[2]])).attr('stroke-color', 'black');
        svg.select('#datapoint_' + currentSteps.value)
            .attr('fill', '#ff4d00')
            .attr('stroke-color', 'green')
            .raise();
    }

    toggleLasso() {
        if (this.state.draw_lasso) {
            d3.select(this.embeddingRef.current.current).select('svg').remove('lasso');
        } else if (this.lasso !== null) {
            d3.select(this.embeddingRef.current.current).select('svg').call(this.lasso);
        }
        this.setState({ draw_lasso: !this.state.draw_lasso });
    }

    componentDidUpdate() {
        this.updateChartColors(
            this.props.currentSteps,
            this.props.currentRewardData,
            this.state.color_scale,
            this.props.highlightedEpisodes
        );
    }

    drawChart(data, selectDatapoint, rewardData, doneData, colorScale, highlightedEpisodes) {
        const margin = { top: 0, right: 0, bottom: 0, left: 0 };
        const done_idx = doneData.reduce((a, elem, i) => (elem === true && a.push(i), a), []);
        d3.select(this.embeddingRef.current.current).select('*').remove();
        const svgWidth = this.embeddingRef.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = this.embeddingRef.current.parentElement.clientHeight - margin.top - margin.bottom;
        if (svgWidth < 0 || svgHeight < 0) return;

        let is_one_d = false;
        if (data.length > 0 && data[0].length === 1) {
            // Check if embedding data is 1D or 2D
            is_one_d = true;

            // If embedding is 2D, add time (a.k.a. steps as the x dimension), first x is an array from 1 to length of data
            const time_steps = Array.from(Array(data.length).keys());
            data = data.map((k, i) => [time_steps[i], ...k]);
        }

        const svg = d3
            .select(this.embeddingRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const x = d3
            .scaleLinear()
            .domain([d3.min(data.map((d) => d[0])), d3.max(data.map((d) => d[0]))])
            .range([0, svgWidth]);
        /*let xAxis = d3.axisBottom(x)
            .ticks((svgWidth + 2) / (svgHeight + 2) * 5)
            .tickSize(svgHeight)
            .tickPadding(8 - svgHeight);*/

        const y = d3
            .scaleLinear()
            .range([svgHeight, 0])
            .domain([d3.max(data.map((d) => d[1])), d3.min(data.map((d) => d[1]))]);
        /*let yAxis = d3.axisRight(y)
            .ticks(5)
            .tickSize(svgWidth)
            .tickPadding(8 - svgWidth);*/

        const zoom = d3
            .zoom()
            .scaleExtent([0.5, 45])
            .translateExtent([
                [-200, -200],
                [svgWidth + 200, svgHeight + 200],
            ])
            .on('zoom', zoomed);

        /*let gX = svg.append("g")
            .attr("class", "axis-embed axis--x")
            .call(xAxis);*/

        /*let gY = svg.append("g")
            .attr("class", "axis-embed axis--y")
            .call(yAxis);*/

        const view = svg.append('g');

        view.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', svgHeight)
            .attr('width', svgWidth)
            .style('opacity', '0');

        const lineFunction = d3
            .line()
            .curve(d3.curveCatmullRom)
            .x(function (d) {
                return x(d[0]);
            })
            .y(function (d) {
                return y(d[1]);
            });

        // Compute stroke outline for segment p12.
        /*let lineJoin = function (p0, p1, p2, p3, width) {
            var u12 = perp(p1, p2),
                r = width / 2,
                a = [p1[0] + u12[0] * r, p1[1] + u12[1] * r],
                b = [p2[0] + u12[0] * r, p2[1] + u12[1] * r],
                c = [p2[0] - u12[0] * r, p2[1] - u12[1] * r],
                d = [p1[0] - u12[0] * r, p1[1] - u12[1] * r];

            if (p0) { // clip ad and dc using average of u01 and u12
                var u01 = perp(p0, p1), e = [p1[0] + u01[0] + u12[0], p1[1] + u01[1] + u12[1]];
                a = lineIntersect(p1, e, a, b);
                d = lineIntersect(p1, e, d, c);
            }

            if (p3) { // clip ab and dc using average of u12 and u23
                var u23 = perp(p2, p3), e = [p2[0] + u23[0] + u12[0], p2[1] + u23[1] + u12[1]];
                b = lineIntersect(p2, e, a, b);
                c = lineIntersect(p2, e, d, c);
            }

            return "M" + a + "L" + b + " " + c + " " + d + "Z";
        }

        // Compute intersection of two infinite lines ab and cd.
        let lineIntersect = function (a, b, c, d) {
            var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3,
                y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3,
                ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
            return [x1 + ua * x21, y1 + ua * y21];
        }

        // Compute unit vector perpendicular to p01.
        let perp = function (p0, p1) {
            var u01x = p0[1] - p1[1], u01y = p1[0] - p0[0],
                u01d = Math.sqrt(u01x * u01x + u01y * u01y);
            return [u01x / u01d, u01y / u01d];
        }

        // Sample the SVG path uniformly with the specified precision.
        let samples = function (path, precision) {
            var n = path.getTotalLength(), t = [0], i = 0, dt = precision;
            if (n == 0)
                return null;
            while ((i += dt) < n) t.push(i);
            t.push(n);
            return t.map(function (t) {
                var p = path.getPointAtLength(t), a = [p.x, p.y];
                a.t = t / n;
                return a;
            });
        }

        // Compute quads of adjacent points [p0, p1, p2, p3].
        let quads = function (points) {
            if (points == null)
                return [];
            return d3.range(points.length - 1).map(function (i) {
                var a = [points[i - 1], points[i], points[i + 1], points[i + 2]];
                a.t = (points[i][2] + points[i + 1][2]) / 2;
                return a;
            });
        }*/

        const splitData = this.splitArray(data, done_idx).filter((d, i) => highlightedEpisodes.includes(i));

        const paths = view
            .selectAll('g')
            .data(splitData)
            .enter()
            .append('g')
            .attr('class', (d) => 'path_group_' + d);

        const thePath = paths
            .append('path')
            .attr('class', 'state_path')
            .style('fill', 'none')
            .style('stroke-width', 3)
            .style('opaicty', 0.8)
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

        const circles = view
            .append('g')
            .selectAll('circle')
            .data(data.map((d, i) => [d[0], d[1], i]))
            .enter()
            .append('circle')
            .attr('cx', (d) => x(d[0]))
            .attr('cy', (d) => y(d[1]))
            .attr('r', 5)
            .attr('stroke', 'black')
            .attr('fill-opacity', 0.8)
            .attr('fill', (d) => colorScale(rewardData[d[2]]))
            .attr('id', (d) => 'datapoint_' + d[2])
            .on('click', circleClick);

        const startLabels = view
            .selectAll('start-label-g')
            .data([0].concat(done_idx.slice(0, -1).map((d) => d + 1)))
            .enter()
            .append('g')
            .attr('class', 'start-label-g');

        startLabels
            .append('text')
            .attr('class', 'start-label')
            .attr('x', (d) => x(data[d][0]) + 10)
            .attr('y', (d) => y(data[d][1]) + 10)
            .attr('text-anchor', 'center')
            .text('Start');

        startLabels
            .append('line')
            .attr('class', 'start-label-line')
            .attr('x1', (d) => x(data[d][0]))
            .attr('y1', (d) => y(data[d][1]))
            .attr('x2', (d) => x(data[d][0]) + 10)
            .attr('y2', (d) => y(data[d][1]) + 10)
            .attr('stroke', '#a1a1a1');

        const endLabels = view
            .selectAll('start-label-g')
            .data(done_idx)
            .enter()
            .append('g')
            .attr('class', 'end-label-g');

        endLabels
            .append('text')
            .attr('class', 'done-label')
            .attr('x', (d) => x(data[d][0]) + 10)
            .attr('y', (d) => y(data[d][1]) + 10)
            .attr('text-anchor', 'center')
            .text('Done');

        endLabels
            .append('line')
            .attr('class', 'end-label-line')
            .attr('x1', (d) => x(data[d][0]))
            .attr('y1', (d) => y(data[d][1]))
            .attr('x2', (d) => x(data[d][0]) + 10)
            .attr('y2', (d) => y(data[d][1]) + 10)
            .attr('stroke', '#a1a1a1');

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

        this.lasso = d3Lasso
            .lasso()
            .closePathSelect(true)
            .closePathDistance(100)
            .items(circles)
            .targetArea(svg)
            .on('start', lasso_start)
            .on('draw', lasso_draw)
            .on('end', lasso_end);

        function zoomed(event) {
            view.attr('transform', event.transform);
            //gX.call(xAxis.scale(event.transform.rescaleX(x)));
            //gY.call(yAxis.scale(event.transform.rescaleY(y)));
            // Cut off with two decimal places
            const r = Math.round((5 / event.transform.k) * 100) / 100;
            const width = Math.round((1 / event.transform.k) * 100) / 100;
            circles.attr('r', r).attr('stroke-width', width);
            paths.selectAll('path').style('stroke-width', width * 3);
            startLabels.selectAll('text').attr('font-size', 16 / event.transform.k);
            endLabels.selectAll('text').attr('font-size', 16 / event.transform.k);
        }

        svg.call(zoom);

        function circleClick(d) {
            selectDatapoint({ value: d[2] });
        }

        d3.select(this.colorLegendRef.current.current).select('*').remove();

        d3.select(this.colorLegendRef.current.current)
            .node()
            .appendChild(
                legend({
                    color: d3.scaleSequential([0, 1], d3.interpolateSpectral),
                    title: 'Position in Episodes (as Frac. of Total Episodes)',
                    width: this.colorLegendRef.current.parentElement.clientWidth - 15,
                    tickFormat: '%',
                })
            );
    }

    render() {
        return (
            <div className="evalstyle.embedding_wrapper_div">
                <div ref={this.embeddingRef}></div>
                <div className="evalstyle.control_overlay_div" style={{ left: 15 }}>
                    <input type="checkbox" id="clusteringEnabled" />
                    H. Clustering/ Convex Hull
                    <hr />
                    <input type="checkbox" id="lassoSelection" onChange={this.toggleLasso.bind(this)} /> Manual Cluster
                    (Lasso Selection)
                </div>
                <div
                    className="evalstyle.embedding_overlay_div"
                    style={{
                        display:
                            this.props.timeStamp == 0 || this.state.data_timestamp !== this.props.timeStamp
                                ? 'inline'
                                : 'none',
                    }}
                >
                    <Button
                        variant="secondary"
                        className="evalstyle.embedding_data_button"
                        disabled={this.props.timeStamp == 0}
                        onClick={this.loadData.bind(this)}
                    >
                        Load Embedding View
                    </Button>
                    <p className="evalstyle.grey_text" style={{ padding: 50 }}>
                        Load UMAP embedding for benchmark steps. Note that this may take a while if the observation
                        space is large.
                    </p>
                    <div className="evalstyle.embedding_slider_div">
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
                    <p className="evalstyle.grey_text">
                        Sequence Length {this.state.sequence_length}: Stack multiple steps for clustering
                    </p>
                </div>
                <div className="evalstyle.control_overlay_div" style={{ right: 15 }}>
                    <p>
                        <b>Trajectory Embedding</b>
                        <FontAwesomeIcon
                            icon={faCaretDown}
                            title="left"
                            onClick={() => {
                                const old_toggle = this.state.collapse_explainer_window;
                                this.setState({ collapse_explainer_window: !old_toggle });
                            }}
                        />
                    </p>
                    <Collapse in={this.state.collapse_explainer_window}>
                        <div>
                            <p>
                                Each circle in the embedding represents a single environment states. Progressive
                                environment states are connected by a colored line. Each color represents and individual
                                episode.
                            </p>
                            <p>Samples are color-coded according to the achieved reward.</p>
                            <Button
                                variant="secondary"
                                className="evalstyle.embedding_data_button"
                                disabled={this.props.timeStamp == 0}
                                onClick={this.loadData.bind(this)}
                            >
                                Reload Embedding View
                            </Button>
                            <p className="evalstyle.grey_text" style={{ padding: 50 }}>
                                Reload Embedding with Updated Settings
                            </p>
                        </div>
                    </Collapse>
                    <div ref={this.colorLegendRef}></div>
                </div>
            </div>
        );
    }
}
