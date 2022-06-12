import React, { PureComponent } from 'react';
import { Button, Form, DropdownButton, ButtonGroup, Dropdown } from 'react-bootstrap';
import { legend } from '../Common/Color_Legend';
import * as d3 from 'd3';
import axios from 'axios';
import colorcolor from 'colorcolor';
import Vector from 'vector-object';

const circle_function = (cx, cy, r) => {
    return (
        'M ' +
        (cx - r) +
        ', ' +
        cy +
        ' a ' +
        r +
        ',' +
        r +
        ' 0 1,0 ' +
        r * 2 +
        ',0' +
        ' a ' +
        r +
        ',' +
        r +
        ' 0 1,0 ' +
        -(r * 2) +
        ',0'
    );
};

//Save some angle values
const halfPi = Math.PI / 2;
const threePi_two = (Math.PI * 3) / 2;
const twoPi = Math.PI * 2;
const pi = Math.PI;

export default class Evaluation_Embedding extends PureComponent {
    lasso = null;

    constructor(props) {

        super(props);
        this.embeddingRef = React.createRef();
        this.colorLegendRef = React.createRef();

        this.state = {
            rawdat: [],
            clustering: null,
            clusteringColors: [],
            cluster_num: 1,
            clustering_applied: false,
            indexClusterMap: null,
            data_timestamp: 0,
            sequence_length: 1,
            color_scale_mode: 'step_reward',
            draw_lasso: false,
            current_colors: [],
            color_scale: undefined,
            x: undefined,
            y: undefined,
            append_time: false,
        };

        //Variables to track dragged point location within the hint path, all assigned values when the dataset is provided (in render())
        this.currentIndex = 0;
        this.nextIndex = 1;
        this.lastIndex = -1; //The index of the last view of the dataset
        this.mouseX = -1; //Keep track of mouse coordinates for the dragend event
        this.mouseY = -1;
        this.interpValue = 0; //Stores the current interpolation value (percentage travelled) when a point is dragged between two views
        this.ambiguousPoints = []; //Keeps track of any points which are ambiguous when the hint path is rendered, by assigning the point a flag
        this.loops = []; //Stores points to draw for interaction loops (if any)
        this.timeDirection = 1; //Tracks the direction travelling over time
        this.interpValue = 0; //Stores the current interpolation value (percentage travelled) when a point is dragged between two views
        this.dragActive = false;

        //Variables to track interaction events
        this.draggedPoint = -1;
        this.isAmbiguous = 0; //Whether or not the point being dragged has at least one ambiguous case, set to 0 if none, and 1 otherwise
    }

    changeSequenceSlider(event) {
        const seq_length = event.target.value;
        this.setState({ sequence_length: seq_length });
    }

    resizeSVG() {
        this.props.onShowPolicyView(
            this.drawChart(
                this.state.rawdat,
                this.props.selectDatapoint,
                this.props.currentRewardData,
                this.props.currentDoneData,
                this.state.color_scale,
                this.props.highlightedEpisodes,
                this.props.labelInfo,
                true
            )
        );
    }

    changeColorScaleMode(new_mode) {
        const mode = new_mode;
        this.setState({ color_scale_mode: mode }, this.getColorData);
    }

    loadData() {
        const new_color_scale = d3
            .scaleSequential((t) => d3.interpolateOrRd(t * 0.85 + 0.15))
            .domain(d3.extent(this.props.currentRewardData));
        const use_latent_features = this.props.useLatentFeature ? 1 : 0;
        const embedding_method = this.props.embeddingMethod;
        // If no 2d embedding is selected, only return a one-D embedding (i.e. one component)
        const use_one_d_embedding = this.props.embeddingAxisOption !== '2D embedding' ? 1 : 0;
        const reproject = this.props.reproject ? 1 : 0;
        const append_time = this.state.append_time ? 1 : 0;
        if (this.state.append_time) this.props.embeddingSettings['densmap'] = true;

        //console.log(this.props.experimentName);
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
                    this.props.selectedCheckpoint +
                    '&append_time=' +
                    append_time,
                this.props.embeddingSettings
            )
            .then((res) => {
                const data = res.data;
                const colorData = this.getColorData();
                this.setState(
                    {
                        rawdat: data.embedding,
                        data_timestamp: this.props.timeStamp,
                        color_scale: new_color_scale,
                        current_colors: colorData.data,
                        color_scale: colorData.scale,
                    },
                    this.drawChart(
                        data.embedding,
                        this.props.selectDatapoint,
                        this.props.currentRewardData,
                        this.props.currentDoneData,
                        new_color_scale,
                        this.props.visibleEpisodes,
                        this.props.labelInfo
                    )
                );
            });
    }

    getColorData() {
        if (this.state.color_scale_mode === 'step_reward') {
            if (this.props.currentRewardData.length > 0) {
                const data = this.props.currentRewardData;
                const color_scale = d3
                    .scaleSequential((t) => d3.interpolateOrRd(t * 0.85 + 0.15))
                    .domain(d3.extent(data));
                return { data: data.map((c) => color_scale(c)), scale: color_scale };
            } else {
                return { data: ['ffffff'], scale: this.state.color_scale };
            }
        }
        if (this.state.clustering_applied) {
            const colors = this.state.clusteringColors.slice(0, this.state.cluster_num);
            const domain = Array.from({ length: this.state.cluster_num }, (_, i) => i + 1);
            const color_scale = d3.scaleOrdinal().domain(domain).range(colors);
            return { data: colors, scale: color_scale };
        }
        const data = this.props.infos.map((i) => i[this.state.color_scale_mode]);
        let interpolator = function (t) {
            return d3.interpolateOrRd(t * 0.85 + 0.15);
        };
        if (this.state.color_scale_mode == 'action') {
            const color_scale = d3.scaleOrdinal(d3.schemeSet3).domain(d3.extent(data));
            return { data: data.map((c) => color_scale(c)), scale: color_scale };
        } else if (this.state.color_scale_mode == 'episode index') {
            interpolator = d3.interpolateSpectral;
        }

        const color_scale = d3.scaleSequential(interpolator).domain(d3.extent(data));
        return { data: data.map((c) => color_scale(c)), scale: color_scale };
    }

    getStateColorTypes() {
        return this.props.infoTypes.map((type, i) => {
            return (
                <Dropdown.Item key={type} eventKey={type} active={this.state.color_scale_mode === type}>
                    {type}
                </Dropdown.Item>
            );
        });
    }

    updateColorLegend() {
        if (this.state.color_scale === undefined) return;
        d3.select(this.colorLegendRef.current.current).select('*').remove();
        d3.select(this.colorLegendRef.current.current)
            .node()
            .appendChild(
                legend({
                    color: this.state.color_scale,
                    width: this.colorLegendRef.current.parentElement.clientWidth,
                })
            );
    }

    toggleAppendTime() {
        this.setState({ append_time: !this.state.append_time });
    }

    splitArray(arr, indices) {
        var result = [];
        var lastIndex = 0;
        for (var i = 0; i < indices.length; i++) {
            // Note that the last observations of an episode is already from the next episode (i.e. the one give the done flag, so omit drawing the path)
            result.push(arr.slice(lastIndex, indices[i] + 1));
            lastIndex = indices[i] + 1;
        }
        result.push(arr.slice(Math.min(lastIndex, arr.length - 1)));
        return result;
    }

    // Source: https://stackoverflow.com/a/1484514
    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Source: https://stackoverflow.com/a/18473154
    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians),
        };
    }

    setColorScaleMode(mode) {
        this.setState({ color_scale_mode: mode });
    }

    // Source: https://stackoverflow.com/a/18473154
    describeArc(x, y, radius, startAngle, endAngle) {
        if (endAngle >= 360) {
            return (
                'M ' +
                (x - radius) +
                ', ' +
                y +
                ' a ' +
                radius +
                ',' +
                radius +
                ' 0 1,0 ' +
                radius * 2 +
                ',0' +
                ' a ' +
                radius +
                ',' +
                radius +
                ' 0 1,0 ' +
                -(radius * 2) +
                ',0'
            );
        }

        const start = this.polarToCartesian(x, y, radius, endAngle);
        const end = this.polarToCartesian(x, y, radius, startAngle);

        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

        const d = ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');

        return d;
    }

    updateChartColors(highlightSteps, visibleEpisodes) {
        // If the drag interaction is active, don't update the plot
        if (this.dragActive) return;

        const higlightHiddenMap = this.props.highlightHiddenMap;
        const currentSteps = highlightSteps.new;
        const previousSteps = highlightSteps.previous;
        const current_colors = this.state.current_colors;

        const svg = d3.select(this.embeddingRef.current.current);

        const x = this.state.x;
        const y = this.state.y;

        if (this.state.clustering == null) {
            const state_representations = svg.selectAll('.state_representation');
            if (state_representations.empty() || x == undefined || y == undefined) return;

            state_representations
                .attr('d', function (d, i) {
                    const cx = x(d[0]);
                    const cy = y(d[1]);
                    const r = 5;

                    if (higlightHiddenMap[d[2]] === 1) {
                        return 'M ' + (cx - r) + ' ' + (cy - r) + ' h ' + 2 * r + ' v ' + 2 * r + ' h ' + -2 * r + ' Z';
                    } else {
                        return circle_function(cx, cy, r);
                    }
                })
                .attr('fill', (d, i) => this.state.current_colors[i]);

            // Selected all path with state path prefix
            svg.selectAll('.state_path').attr('display', 'none');
            visibleEpisodes.forEach((i) => svg.selectAll('.state_path_' + i).attr('display', 'display'));
            visibleEpisodes.forEach((i) => svg.selectAll('.state_path_' + i).attr('stroke-width', 2));
            svg.select('.state_path_' + this.props.selectedEpisode).attr('stroke-width', 4);
        } else {
            if (this.state.clustering_applied) {
                const circles = svg.selectAll('.clusterpoints');
                if (circles.empty()) return;

                const colors = this.state.clusteringColors;
                const cluster_highlightnum_map = new Map();
                const cluster_index_map = this.state.indexClusterMap;

                let highlightsActive = false;
                for (const i in higlightHiddenMap) {
                    if (higlightHiddenMap[i] !== 1) continue;

                    highlightsActive = true;

                    const cl_id = cluster_index_map.get(key);

                    if (!cluster_highlightnum_map.has(cl_id)) cluster_highlightnum_map.set(cl_id, 1);
                    else cluster_highlightnum_map.set(cl_id, cluster_highlightnum_map.get(cl_id) + 1);
                }

                const r = d3.scaleLinear().range([3, 30]).domain([1, this.state.rawdat.length]);

                svg.selectAll('.clusterHighlightingGlyphs').attr('d', (d) =>
                    this.describeArc(
                        x(d.x_mean),
                        y(d.y_mean),
                        r(d.num_points) + 5,
                        0,
                        ((cluster_highlightnum_map.has(d.id) ? cluster_highlightnum_map.get(d.id) : 0) / d.num_points) *
                            360
                    )
                );

                circles.attr('fill', (d, i) => colors[i % colors.length]);
            } else {
                const state_representations = svg.selectAll('.state_representation');
                if (state_representations.empty()) return;

                const clusternum = this.state.cluster_num;

                state_representations.attr('d', function (d, i) {
                    const cx = x(d[0]);
                    const cy = y(d[1]);
                    const r = 5;

                    if (higlightHiddenMap[d[2]] === 1) {
                        return 'M ' + (cx - r) + ' ' + (cy - r) + ' h ' + 2 * r + ' v ' + 2 * r + ' h ' + -2 * r + ' Z';
                    } else {
                        return circle_function(cx, cy, r);
                    }
                });

                const colors = this.state.clusteringColors;
                const cluster_index_map = this.state.indexClusterMap;
                state_representations.attr('fill', (d) => colors[cluster_index_map.get(d[2]) % colors.length]);
            }
        }

        const d_point = svg.select('#datapoint_' + currentSteps.value);
        if (!d_point.empty()) {
            const d_val = svg.select('#datapoint_' + currentSteps.value).data();
            const scale = 1 / d3.zoomTransform(svg.select('#step_marker').node()).k;
            svg.select('#step_marker')
                .datum(d_val[0])
                .attr('d', (d) => circle_function(x(d[0]), y(d[1]), 8))
                .attr('transform', function (d) {
                    const cx = x(d[0]);
                    const cy = y(d[1]);
                    return (
                        'matrix(' +
                        scale +
                        ', 0, 0, ' +
                        scale +
                        ', ' +
                        (cx - scale * cx) +
                        ', ' +
                        (cy - scale * cy) +
                        ')'
                    );
                });
        }

        svg.selectAll('.state_representation').attr('display', 'display');
        svg.selectAll('.datapoint_images').attr('display', 'display');
        svg.selectAll('.label-g').attr('display', 'display');

        for (const i in higlightHiddenMap) {
            if (higlightHiddenMap[i] !== -1) continue;

            svg.select('#datapoint_' + i).attr('display', 'none');
            svg.select('#datapoint_image_' + i).attr('display', 'none');
            svg.select('#label-g_' + i).attr('display', 'none');
        }

        this.updateColorLegend();

        this.currentIndex = currentSteps.value;
        this.previousIndex = currentSteps.value - 1;
        this.nextIndex = currentSteps.value + 1;
    }

    getClusterMapForN(clustering, clusternum) {
        let current_cluster_num = 1;
        const cluster_list = [clustering];

        // Remove elements in O(1). Source: https://stackoverflow.com/a/54270177
        Array.prototype.mySwapDelete = function arrayMySwapDelete(index) {
            this[index] = this[this.length - 1];
            this.pop();
        };

        while (current_cluster_num < clusternum) {
            let max_height = -1;
            let max_height_cluster_index = -1;
            let max_height_cluster = null;

            for (let i = 0; i < cluster_list.length; i++) {
                if (cluster_list[i].height > max_height && !cluster_list[i].isLeaf) {
                    max_height = cluster_list[i].height;
                    max_height_cluster = cluster_list[i];
                    max_height_cluster_index = i;
                }
            }

            if (max_height_cluster == null) break;

            cluster_list.mySwapDelete(max_height_cluster_index);
            cluster_list.push(max_height_cluster.children[0]);
            cluster_list.push(max_height_cluster.children[1]);
            current_cluster_num++;
        }

        const index_cluster_map = new Map();

        for (let i = 0; i < cluster_list.length; i++) {
            const children_list = [cluster_list[i]];

            while (children_list.length > 0) {
                if (children_list[0].isLeaf) {
                    index_cluster_map.set(children_list[0].index, i);
                    children_list.mySwapDelete(0);
                } else {
                    children_list.push(children_list[0].children[0], children_list[0].children[1]);
                    children_list.mySwapDelete(0);
                }
            }
        }

        return index_cluster_map;
    }

    setSelectedClusteringNum(event) {
        const clusternum = event.target.value;
        const clustering = this.state.clustering;

        const map = this.getClusterMapForN(clustering, clusternum);

        //circles.attr("fill", (d, i) => colors[index_cluster_map.get(d[2])]).attr("stroke-color", "black");
        this.setState({ indexClusterMap: map, cluster_num: clusternum });
    }

    unclusterClicked() {
        this.props.setClusteringMode(false);
        this.setState({
            clustering_applied: false,
            color_scale_mode: 'step_reward',
            clustering: null,
            cluster_num: 1,
            indexClusterMap: null,
            clusteringColors: [],
        });
        this.drawChart(
            this.state.rawdat,
            this.props.selectDatapoint,
            this.props.currentRewardData,
            this.props.currentDoneData,
            this.state.color_scale,
            this.props.highlightedEpisodes,
            this.props.labelInfo
        );
    }

    resetClusteringClicked() {
        this.drawChart(
            this.state.rawdat,
            this.props.selectDatapoint,
            this.props.currentRewardData,
            this.props.currentDoneData,
            this.state.color_scale,
            this.props.highlightedEpisodes,
            this.props.labelInfo
        );
        this.setState({ clustering_applied: false });
    }

    applyClusteringClicked() {
        this.drawChartClustered(
            this.state.rawdat,
            this.props.selectDatapoint,
            this.props.currentRewardData,
            this.props.currentDoneData,
            this.state.color_scale,
            this.props.highlightedEpisodes,
            this.props.labelInfo
        );
        this.setState({ clustering_applied: true, color_scale_mode: 'cluster index' });
    }

    getCLusteringCached() {
        console.log('getCLusteringCached');
        return axios
            .get(
                '/routing/get_clustering_results?sequence_length=' +
                    this.props.selectedCheckpoint +
                    '&experiment=' +
                    this.props.experimentName +
                    '&exp_id=' +
                    this.props.selectedExp
            )
            .then((res) => {
                console.log('post clustering results', res.data);
                return res.data;
            });
    }

    clusterBtnClicked() {
        if (this.state.rawdat.length <= 0) {
            return;
        }

        this.getCLusteringCached().then((d) => {
            let tree = null;
            const data = this.state.rawdat;

            if (d === '') {
                console.log('clustering calculation');
                tree = null; /*agnes(data, {
                    method: 'centroid',
                });*/

                const tree_json = JSON.stringify(tree);
                axios.post(
                    '/routing/store_clustering_results?sequence_length=' +
                        this.props.selectedCheckpoint +
                        '&experiment=' +
                        this.props.experimentName +
                        '&exp_id=' +
                        this.props.selectedExp,
                    { c: tree_json }
                );
            } else {
                tree = d;
            }

            // Source: https://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
            const n = 500;
            const golden_ratio_conjugate = 0.618033988749895;
            let h = 0;
            const colors = [];
            for (let i = 0; i < n; i++) {
                h = (h + golden_ratio_conjugate) % 1.0;
                const c = colorcolor('hsv(' + Math.round(h * 360) + ',50%, 95%)', 'hex');
                colors.push(c);
            }

            const map = this.getClusterMapForN(tree, 1);
            this.props.setClusteringMode(true);
            this.setState({ clustering: tree, clusteringColors: colors, indexClusterMap: map });
        });
    }

    toggleLasso() {
        if (this.state.draw_lasso) {
            d3.select(this.embeddingRef.current.current).select('svg').remove('lasso');
        } else if (this.lasso !== null) {
            d3.select(this.embeddingRef.current.current).select('svg').call(this.lasso);
        }
        this.setState({ draw_lasso: !this.state.draw_lasso });
    }

    componentDidUpdate(prevProps, prevState) {
        //console.log(this.props.visibleEpisodes);
        if (
            this.props.dataTimestamp !== prevProps.dataTimestamp ||
            this.state.color_scale_mode !== prevState.color_scale_mode
        ) {
            const colorData = this.getColorData();
            this.setState(
                { current_colors: colorData.data, color_scale: colorData.scale },
                this.updateChartColors(this.props.highlightSteps, this.props.visibleEpisodes)
            );
        }
        this.updateChartColors(this.props.highlightSteps, this.props.visibleEpisodes);
    }

    drawChartClustered(
        data,
        selectDatapoint,
        rewardData,
        doneData,
        colorScale,
        visibleEpisodes,
        labelInfos,
        initialPVReRender = false
    ) {
        if (this.state.indexClusterMap == null) {
            return;
        }

        const margin = { top: 0, right: 0, bottom: 0, left: 0 };
        const done_idx = doneData.reduce((a, elem, i) => (elem === true && a.push(i), a), []);
        d3.select(this.embeddingRef.current.current).select('*').remove();
        let svgWidth = this.embeddingRef.current.parentElement.clientWidth - margin.left - margin.right;
        if (initialPVReRender) svgWidth /= 2;
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

        const y = d3
            .scaleLinear()
            .range([svgHeight, 0])
            .domain([d3.max(data.map((d) => d[1])), d3.min(data.map((d) => d[1]))]);

        const zoom = d3
            .zoom()
            .scaleExtent([0.2, 15])
            .translateExtent([
                [-600, -600],
                [svgWidth + 600, svgHeight + 600],
            ])
            .on('zoom', zoomed);

        const arrowPoints = [
            [0, 0],
            [0, 5],
            [5, 2.5],
        ];
        const markerBoxWidth = 5;
        const markerBoxHeight = 5;
        const refX = 2.5;
        const refY = 2.5;

        svg.append('defs')
            .append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
            .attr('refX', refX)
            .attr('refY', refY)
            .attr('markerWidth', markerBoxWidth)
            .attr('markerHeight', markerBoxHeight)
            .attr('orient', 'auto-start-reverse')
            .append('path')
            .attr('d', d3.line()(arrowPoints))
            .attr('fill', 'black');

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

        const cluster_index_map = this.state.indexClusterMap;
        const r = d3.scaleSqrt().range([3, 30]).domain([1, data.length]);

        const cluster_properties = [];

        for (let i = 0; i < this.state.cluster_num; i++) {
            cluster_properties.push({ id: i, x_mean: 0.0, y_mean: 0.0, num_points: 0 });
        }

        const label_data_map = new Map();
        const start_label_data = [0].concat(done_idx.slice(0, -1).map((d) => d + 1));

        for (let i = 0; i < start_label_data.length; i++) {
            label_data_map.set(start_label_data[i], ['Start']);
        }

        for (let i = 0; i < done_idx.length; i++) {
            if (!label_data_map.has(done_idx[i])) label_data_map.set(done_idx[i], ['Done']);
            else label_data_map.get(done_idx[i]).push('Done');
        }

        for (let i = 0; i < labelInfos.length; i++) {
            const label = labelInfos[i].label;
            const ids = labelInfos[i].ids;

            for (let j = 0; j < ids.length; j++) {
                if (!label_data_map.has(ids[j])) label_data_map.set(ids[j], [label]);
                else label_data_map.get(ids[j]).push(label);
            }
        }

        const cluster_label_map = new Map();

        for (let i = 0; i < data.length; i++) {
            const cl_num = cluster_index_map.get(i);
            const p = data[i];
            cluster_properties[cl_num].last_elem = i;
            cluster_properties[cl_num].num_points++;
            cluster_properties[cl_num].x_mean += p[0];
            cluster_properties[cl_num].y_mean += p[1];

            const labels = label_data_map.has(i) ? label_data_map.get(i) : [];
            for (let j = 0; j < labels.length; j++) {
                if (cluster_label_map.has(cl_num)) {
                    cluster_label_map.get(cl_num).add(labels[j]);
                } else {
                    const s = new Set();
                    s.add(labels[j]);
                    cluster_label_map.set(cl_num, s);
                }
            }
        }

        for (let i = 0; i < this.state.cluster_num; i++) {
            cluster_properties[i].x_mean /= cluster_properties[i].num_points;
            cluster_properties[i].y_mean /= cluster_properties[i].num_points;
        }

        const indexClusterMap = this.state.indexClusterMap;
        const edgeMap = new Map();
        const self_references = new Map();
        let edges = [];
        const splitData = this.splitArray(data, done_idx).filter((d, i) => visibleEpisodes.includes(i));

        let maxEdgeNum = 1;
        let c = 0;

        for (let i = 0; i < splitData.length; i++) {
            for (let j = 0; j < splitData[i].length; j++) {
                if (j === splitData[i].length - 1) {
                    c++;
                    c++;
                    continue;
                }

                const p0_idx = c;
                const p1_idx = c + 1;
                const c0_idx = indexClusterMap.get(p0_idx);
                const c1_idx = indexClusterMap.get(p1_idx);

                if (c0_idx === c1_idx) {
                    const current_v = self_references.has(c0_idx) ? self_references.get(c0_idx) : 0;
                    self_references.set(c0_idx, current_v + 1);
                    c++;
                } else if (edgeMap.has(c0_idx + ',' + c1_idx)) {
                    const e = edgeMap.get(c0_idx + ',' + c1_idx);
                    e.c0_c1_edges++;
                    maxEdgeNum = Math.max(e.c0_c1_edges, maxEdgeNum);
                    c++;
                } else if (edgeMap.has(c1_idx + ',' + c0_idx)) {
                    const e = edgeMap.get(c1_idx + ',' + c0_idx);
                    e.c1_c0_edges++;
                    maxEdgeNum = Math.max(e.c1_c0_edges, maxEdgeNum);
                    c++;
                } else {
                    const e = {
                        p0_x: cluster_properties[c0_idx].x_mean,
                        p0_y: cluster_properties[c0_idx].y_mean,
                        p1_x: cluster_properties[c1_idx].x_mean,
                        p1_y: cluster_properties[c1_idx].y_mean,
                        c0_id: c0_idx,
                        c1_id: c1_idx,
                        c0_c1_edges: 1,
                        c1_c0_edges: 0,
                    };
                    edgeMap.set(c0_idx + ',' + c1_idx, e);
                    c++;
                }
            }
        }
        edges = Array.from(edgeMap.values());

        const glyphScale = d3.scaleSqrt().range([4, 12]).domain([1, maxEdgeNum]);

        const edgeWidthScale = d3.scaleSqrt().range([1, 5]).domain([1, c]);

        const paths = view
            .selectAll('g')
            .data(edges)
            .enter()
            .append('g')
            .attr('class', (d) => 'path_group_' + d);

        const thePath = paths
            .append('path')
            .attr('class', 'clustered_state_path')
            .style('fill', 'none')
            .style('stroke-width', (d) => edgeWidthScale(d.c0_c1_edges + d.c1_c0_edges))
            .attr('vector-effect', 'non-scaling-stroke')
            .style('opacity', 0.8)
            .style('stroke', 'black')
            .datum((d) =>
                [
                    [d.p0_x, d.p0_y, d.c0_c1_edges],
                    [d.p1_x, d.p1_y, d.c1_c0_edges],
                ]
                    .filter((d, i) => true)
                    .map((d, i) => [d[0], d[1], i, d[2]])
            )
            .attr('d', lineFunction);

        const step_marker = view
            .append('g')
            .append('path')
            .datum(data[0])
            .attr('d', (d) => circle_function(x(d[0]), y(d[1]), 8))
            .attr('fill-opacity', 1.0)
            .attr('fill', '#ff3737')
            .attr('fill-opacity', 0.5)
            .attr('stroke', '#ff3737')
            //.attr("stroke-width", 2)
            .attr('id', 'step_marker');

        function createGlyphSVG(d, direction, scale) {
            const edgeNum = direction === 0 ? d.c0_c1_edges : d.c1_c0_edges;

            if (edgeNum === 0) return '';

            const center_V = new Vector({ x: (x(d.p0_x) + x(d.p1_x)) / 2, y: (y(d.p0_y) + y(d.p1_y)) / 2 });
            const px = direction === 0 ? d.p0_x : d.p1_x;
            const py = direction === 0 ? d.p0_y : d.p1_y;
            const center_to_p_V = new Vector({ x: x(px), y: y(py) }).subtract(center_V);
            center_to_p_V.normalize();
            const edge_othogonal_V = new Vector({ x: center_to_p_V.get('y'), y: -center_to_p_V.get('x') });
            edge_othogonal_V.normalize();
            const height = glyphScale(edgeNum) * scale;
            const width = glyphScale(edgeNum) * scale;

            center_V.add(center_to_p_V);

            return (
                'M ' +
                (center_V.get('x') + height * edge_othogonal_V.get('x')) +
                ' ' + //x start
                (center_V.get('y') + height * edge_othogonal_V.get('y')) +
                ' L ' + //y start
                (center_V.get('x') + width * center_to_p_V.get('x')) +
                ' ' + //point 2: x
                (center_V.get('y') + width * center_to_p_V.get('y')) +
                ' L ' + //point 2: y
                (center_V.get('x') - height * edge_othogonal_V.get('x')) +
                ' ' + //point 3: x
                (center_V.get('y') - height * edge_othogonal_V.get('y')) +
                ' Z'
            ); //point 3: y
        }

        const glyphs1 = view
            .append('g')
            .selectAll('path')
            .data(edges)
            .enter()
            .append('path')
            .attr('d', (d) => createGlyphSVG(d, 0, 1))
            .style('fill', 'red');

        const glyphs2 = view
            .append('g')
            .selectAll('path')
            .data(edges)
            .enter()
            .append('path')
            .attr('d', (d) => createGlyphSVG(d, 1, 1))
            .style('fill', 'red');

        const circles = view
            .append('g')
            .selectAll('circle')
            .data(cluster_properties)
            .enter()
            .append('circle')
            .attr('cx', (d) => x(d.x_mean))
            .attr('cy', (d) => y(d.y_mean))
            .attr('r', (d) => r(d.num_points))
            .attr('fill-opacity', 1.0)
            .attr('fill', 'blue')
            .attr('class', 'clusterpoints')
            .attr('id', (d) => 'clusterpoint_' + d.id)
            .on('click', circleClick);

        const Gen = d3
            .line()
            .x((p) => p.x)
            .y((p) => p.y)
            .curve(d3.curveBasis);

        const ext = 40;
        const deg = 30;

        function self_reference_path(d, polarToCartesian) {
            const xc = x(d.x_mean);
            const yc = y(d.y_mean);
            const rad = r(d.num_points);

            const p0 = polarToCartesian(xc, yc, rad, -deg);
            const p1 = polarToCartesian(xc, yc, rad, +deg);

            return Gen([
                { x: p0.x, y: p0.y },
                { x: xc - 0.5 * ext, y: p0.y - 0.5 * ext },
                { x: xc, y: p0.y - ext },
                { x: xc + 0.5 * ext, y: p0.y - 0.5 * ext },
                { x: p1.x, y: p1.y },
            ]);
        }

        const self_reference_edges = view
            .append('g')
            .selectAll('path')
            .data(cluster_properties.filter((d) => self_references.has(d.id)))
            .enter()
            .append('path')
            .attr('d', (d) => self_reference_path(d, this.polarToCartesian))
            .attr('fill', 'none')
            .attr('stroke-width', (d) => edgeWidthScale(self_references.get(d.id)))
            .attr('vector-effect', 'non-scaling-stroke')
            .attr('marker-start', 'url(#arrow)')
            .attr('stroke', 'black');

        const highlighting_glyphs = view
            .append('g')
            .selectAll('path')
            .data(cluster_properties)
            .enter()
            .append('path')
            .attr('d', '')
            .attr('stroke', 'orange')
            .attr('stroke-width', 5)
            .attr('fill', 'none')
            .attr('class', 'clusterHighlightingGlyphs');

        const labeldist = 8;
        const labelStrokeWidth = 3;

        const labels = view
            .selectAll('label-g')
            .data(cluster_properties.filter((d, i) => cluster_label_map.has(d.id)))
            .enter()
            .append('g')
            .attr('class', 'label-g');

        labels
            .append('text')
            .attr('class', 'label')
            .attr('x', (d) => x(d.x_mean) + r(d.num_points) + labeldist)
            .attr('y', (d) => y(d.y_mean) + r(d.num_points) + labeldist)
            .attr('text-anchor', 'center')
            .text((d) => [...cluster_label_map.get(d.id)].join('/'));

        labels
            .append('line')
            .attr('class', 'label-line')
            .attr('vector-effect', 'non-scaling-stroke')
            .attr('x1', (d) => x(d.x_mean))
            .attr('y1', (d) => y(d.y_mean))
            .attr('x2', (d) => x(d.x_mean) + r(d.num_points) + labeldist)
            .attr('y2', (d) => y(d.y_mean) + r(d.num_points) + labeldist)
            .attr('stroke', '#a1a1a1')
            .attr('stroke-width', labelStrokeWidth);

        function zoomed(event) {
            view.attr('transform', event.transform);
            //gX.call(xAxis.scale(event.transform.rescaleX(x)));
            //gY.call(yAxis.scale(event.transform.rescaleY(y)));
            // Cut off with two decimal places
            const width = Math.round((1 / event.transform.k) * 100) / 100;
            circles.attr('r', (d) => r(d.num_points) * width).attr('stroke-width', width);
            glyphs1.attr('d', (d) => createGlyphSVG(d, 0, width));
            glyphs2.attr('d', (d) => createGlyphSVG(d, 1, width));

            labels
                .selectAll('text')
                .attr('x', (d) => x(d.x_mean) + (r(d.num_points) + labeldist) * width)
                .attr('y', (d) => y(d.y_mean) + (r(d.num_points) + labeldist) * width)
                .attr('font-size', 16 / event.transform.k);

            labels
                .selectAll('line')
                .attr('x2', (d) => x(d.x_mean) + (r(d.num_points) + labeldist) * width)
                .attr('y2', (d) => y(d.y_mean) + (r(d.num_points) + labeldist) * width);

            highlighting_glyphs.attr('transform', function (d) {
                const cx = x(d.x_mean);
                const cy = y(d.y_mean);
                const scale = width;
                return (
                    'matrix(' + scale + ', 0, 0, ' + scale + ', ' + (cx - scale * cx) + ', ' + (cy - scale * cy) + ')'
                );
            });

            self_reference_edges.attr('transform', function (d) {
                const cx = x(d.x_mean);
                const cy = y(d.y_mean);
                const scale = width;
                return (
                    'matrix(' + scale + ', 0, 0, ' + scale + ', ' + (cx - scale * cx) + ', ' + (cy - scale * cy) + ')'
                );
            });
        }

        svg.call(zoom);

        function circleClick(d) {
            selectDatapoint({ value: d.last_elem });
        }

        d3.select(this.colorLegendRef.current.current).select('*').remove();
    }

    drawChart(
        data,
        selectDatapoint,
        rewardData,
        doneData,
        colorScale,
        highlightedEpisodes,
        labelInfos,
        initialPVReRender = false
    ) {
        const _self = this;
        this.lastIndex = data.length - 1;
        const margin = { top: 0, right: 0, bottom: 0, left: 0 };
        const done_idx = doneData.reduce((a, elem, i) => (elem === true && a.push(i), a), []);
        d3.select(this.embeddingRef.current.current).select('*').remove();
        let svgWidth = this.embeddingRef.current.parentElement.clientWidth - margin.left - margin.right;
        // If initial redraw after policy view, half the width (later updates will have correct dimensions)
        if (initialPVReRender) svgWidth /= 2;
        const svgHeight = this.embeddingRef.current.parentElement.clientHeight;
        if (svgWidth < 0 || svgHeight < 0) return;

        let is_one_d = false;
        if (data.length > 0 && data[0].length === 1) {
            // Check if embedding data is 1D or 2D
            is_one_d = true;

            // If embedding is 2D, add time (a.k.a. steps as the x dimension), first x is an array from 1 to length of data
            const time_steps = Array.from(Array(data.length).keys());
            data = data.map((k, i) => [this.props.infos.map((v) => v['episode step'])[i], ...k]);
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

        const y = d3
            .scaleLinear()
            .range([svgHeight, 0])
            .domain([d3.max(data.map((d) => d[1])), d3.min(data.map((d) => d[1]))]);

        const zoom = d3
            .zoom()
            .scaleExtent([0.2, 15])
            .translateExtent([
                [-600, -600],
                [svgWidth + 600, svgHeight + 600],
            ])
            .on('zoom', zoomed);

        svg.call(zoom);

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

        const splitData = this.splitArray(data, done_idx); //.filter((d, i) => highlightedEpisodes.includes(i));

        const paths = view
            .selectAll('g')
            .data(splitData)
            .enter()
            .append('g')
            .attr('class', (d) => 'path_group_' + d);

        const thePath = paths
            .append('path')
            .attr('class', (d, i) => 'state_path state_path_' + i)
            .attr('id', (d, i) => 'state_path_' + i)
            .style('fill', 'none')
            .style('stroke-width', 3)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('opacity', 0.8)
            .style('stroke', (d, i) => d3.interpolateSpectral(i / splitData.length))
            .datum((d) => d.filter((d, i) => true).map((d, i) => [d[0], d[1], i]))
            .attr('d', lineFunction);

        const pathLength = paths.select('#state_path_0').node().getTotalLength();
        const distanceBetweenPoints = Math.floor(pathLength / 100);
        const totalPoints = Math.floor(pathLength / distanceBetweenPoints);
        const pointInterval = 35 / totalPoints;
        // console.log('totalpoints', totalPoints);
        // console.log(pointInterval);
        for (let point = 0; point < 35; point += pointInterval) {
            view.append('text')
                .append('textPath')
                .attr('id', `${point}`)
                .attr('fill', 'green')
                .attr('dominant-baseline', 'central')
                .attr('font-size', '35px')
                .attr('xlink:href', '#state_path state_path_0')
                .attr('startOffset', `${point}%`)
                .html('➤');
        }

        const state_representations = view
            .append('g')
            .selectAll('path')
            .data(data.map((d, i) => [d[0], d[1], i]))
            .enter()
            .append('path')
            .attr('d', (d) => circle_function(x(d[0]), y(d[1]), 6))
            .attr('fill-opacity', 0.8)
            .attr('fill', (d) => colorScale(rewardData[d[2]]))
            .attr('opacity', 0.8)
            .attr('class', 'state_representation')
            .attr('id', (d) => 'datapoint_' + d[2])
            .on('click', circleClick);

        _self.draggedPoint = null;
        _self.previousDragAngle = 0;
        const step_marker_drag = d3
            .drag()
            .on('start', function (d) {
                _self.dragActive = true;
                _self.draggedPoint = d[2];
                _self.previousDragAngle = 0;
            })
            .on('drag', function (event, d) {
                // Maybe update time slider
                updateDraggedPoint(d.id, event.x, event.y, d.nodes);
            })
            .on('end', function (d) {
                //In this event, mouse coordinates are undefined, need to use the saved
                //coordinates of the scatterplot object
                // scatterplot.snapToView(d.id,d.nodes);
                // Update time slider
                _self.dragActive = false;
                selectDatapoint({ value: _self.currentIndex });
            });

        const step_marker = view
            .append('g')
            .append('path')
            .datum(data[0])
            .attr('d', (d) => circle_function(x(d[0]), y(d[1]), 8))
            .attr('fill-opacity', 1.0)
            .attr('fill', '#ff3737')
            .attr('fill-opacity', 0.5)
            .attr('stroke', '#ff3737')
            .attr('stroke-width', 2)
            .attr('id', 'step_marker')
            .call(step_marker_drag);

        const step_images = view
            .append('g')
            .selectAll('image')
            .data(data.map((d, i) => [d[0], d[1], i]).filter((d) => d[2] % Math.floor(data.length / 30) === 0))
            .enter()
            .append('svg:image')
            .attr('x', (d) => x(d[0]))
            .attr('y', (d) => y(d[1]))
            .attr('width', 40)
            .attr('height', 48)
            .attr('class', 'datapoint_images')
            .attr('id', (d) => 'datapoint_image_' + d[2])
            .attr('opacity', 0.3)
            .attr(
                'xlink:href',
                (d) => '/routing/get_single_obs?step=' + d[2] + '&channels=[]&type=render&rdn=' + Math.random()
            );

        const label_data_map = new Map();
        const start_label_data = [0].concat(done_idx.slice(0, -1).map((d) => d + 1));

        for (let i = 0; i < start_label_data.length; i++) {
            label_data_map.set(start_label_data[i], ['Start']);
        }

        for (let i = 0; i < done_idx.length; i++) {
            if (!label_data_map.has(done_idx[i])) label_data_map.set(done_idx[i], ['Done']);
            else label_data_map.get(done_idx[i]).push('Done');
        }

        for (let i = 0; i < labelInfos.length; i++) {
            const label = labelInfos[i].label;
            const ids = labelInfos[i].ids;

            for (let j = 0; j < ids.length; j++) {
                if (!label_data_map.has(ids[j])) label_data_map.set(ids[j], [label]);
                else label_data_map.get(ids[j]).push(label);
            }
        }

        const labels = view
            .selectAll('label-g')
            .data(data.map((d, i) => [d[0], d[1], i]).filter((d) => label_data_map.has(d[2])))
            .enter()
            .append('g')
            .attr('class', 'label-g')
            .attr('id', (d) => 'label-g_' + d[2]);

        _self.updateColorLegend();

        labels
            .append('text')
            .attr('class', 'label')
            .attr('x', (d) => x(d[0]) + 10)
            .attr('y', (d) => y(d[1]) + 10)
            .attr('text-anchor', 'center')
            .text((d) => label_data_map.get(d[2]).join('/'));

        labels
            .append('line')
            .attr('class', 'label-line')
            .attr('vector-effect', 'non-scaling-stroke')
            .attr('x1', (d) => x(d[0]))
            .attr('y1', (d) => y(d[1]))
            .attr('x2', (d) => x(d[0]) + 10)
            .attr('y2', (d) => y(d[1]) + 10)
            .attr('stroke', '#a1a1a1');

        function zoomed(event) {
            view.attr('transform', event.transform);
            //gX.call(xAxis.scale(event.transform.rescaleX(x)));
            //gY.call(yAxis.scale(event.transform.rescaleY(y)));
            // Cut off with two decimal places
            const r = Math.round((5 / event.transform.k) * 100) / 100;
            const width = Math.round((1 / event.transform.k) * 100) / 100;

            state_representations.attr('transform', function (d) {
                const cx = x(d[0]);
                const cy = y(d[1]);
                const scale = width;
                return (
                    'matrix(' + scale + ', 0, 0, ' + scale + ', ' + (cx - scale * cx) + ', ' + (cy - scale * cy) + ')'
                );
            });
            step_marker.attr('transform', function (d) {
                const cx = x(d[0]);
                const cy = y(d[1]);
                const scale = width;
                return (
                    'matrix(' + scale + ', 0, 0, ' + scale + ', ' + (cx - scale * cx) + ', ' + (cy - scale * cy) + ')'
                );
            });

            labels.selectAll('text').attr('font-size', 16 / event.transform.k);
            step_images.attr('opacity', Math.min(0.3 * event.transform.k, 0.9));
        }

        function circleClick(d) {
            selectDatapoint({ value: d[2] });
        }

        function updateDraggedPoint(id, mouseX, mouseY) {
            var pt1_x = x(data[_self.currentIndex][0]);
            var pt2_x = x(data[_self.nextIndex][0]);
            var pt1_y = y(data[_self.currentIndex][1]);
            var pt2_y = y(data[_self.nextIndex][1]);
            var newPoint = [];

            _self.isAmbiguous = false;
            _self.ambiguousPoints = [];

            if (_self.isAmbiguous == 1) {
                //Ambiguous cases exist on the hint path

                const currentPointInfo = _self.ambiguousPoints[id];
                const nextPointInfo = _self.ambiguousPoints[id + 1];

                if (currentPointInfo[0] == 1 && nextPointInfo[0] == 0) {
                    //Approaching loop from left side of hint path (not on loop yet)
                    loopCurrent = 3;
                    loopNext = 4;
                    newPoint = dragAlongPath(id, pt1_x, pt1_y, pt2_x, pt2_y, mouseX, mouseY);
                } else if (currentPointInfo[0] == 0 && nextPointInfo[0] == 1) {
                    //Approaching loop from right side on hint path (not on loop yet)
                    loopCurrent = 0;
                    loopNext = 1;
                    newPoint = dragAlongPath(id, pt1_x, pt1_y, pt2_x, pt2_y, mouseX, mouseY);
                } else if (currentPointInfo[0] == 1 && nextPointInfo[0] == 1) {
                    //In middle of stationary point sequence
                    dragAlongLoop(id, currentPointInfo[1], mouseX, mouseY, mouseX, mouseY);
                    return;
                } else {
                    newPoint = dragAlongPath(id, pt1_x, pt1_y, pt2_x, pt2_y, mouseX, mouseY);
                }
            } else {
                //No ambiguous cases exist
                newPoint = dragAlongPath(id, pt1_x, pt1_y, pt2_x, pt2_y, mouseX, mouseY);
            }

            var draggedPoint = svg.select('#step_marker');

            draggedPoint.style(
                'fill-opacity',
                1 - Math.abs(findPixelDistance(_self.mouseX, _self.mouseY, newPoint[0], newPoint[1]) / 100)
            );

            //Re-draw the dragged point
            const scale = 1 / d3.zoomTransform(draggedPoint.node()).k;
            svg.select('#step_marker')
                .attr('d', (d) => circle_function(newPoint[0], newPoint[1], 8))
                .attr('transform', function (d) {
                    const cx = newPoint[0];
                    const cy = newPoint[1];
                    return (
                        'matrix(' +
                        scale +
                        ', 0, 0, ' +
                        scale +
                        ', ' +
                        (cx - scale * cx) +
                        ', ' +
                        (cy - scale * cy) +
                        ')'
                    );
                });
        }

        function dragAlongPath(id, pt1_x, pt1_y, pt2_x, pt2_y, mouseX, mouseY) {
            //Get the two points of the line segment currently dragged along
            const minDist = minDistancePoint(mouseX, mouseY, pt1_x, pt1_y, pt2_x, pt2_y);
            var newPoint = []; //The new point to draw on the line
            var t = minDist[2]; //To test whether or not the dragged point will pass pt1 or pt2

            //Update the position of the dragged point
            if (t < 0) {
                //Passed current
                moveBackward();
                newPoint = [pt1_x, pt1_y];
            } else if (t > 1) {
                //Passed next
                moveForward();
                newPoint = [pt2_x, pt2_y];
            } else {
                //Some in between the views (pt1 and pt2)
                newPoint = [minDist[0], minDist[1]];
                //Save the values
                _self.timeDirection = findTimeDirection(t);
                _self.interpValue = t; //Save the interpolation amount
            }
            return newPoint;
        }

        /** Sets the time direction based on the interpolation amount, currently not needed for the interaction
         *  But can be used to log events.
         * @return: the new direction travelling in time
         * */
        function findTimeDirection(interpAmount) {
            var direction =
                interpAmount > _self.interpValue ? 1 : interpAmount < _self.interpValue ? -1 : _self.timeDirection;

            if (_self.timeDirection != direction) {
                //Switched directions
                console.log(
                    'switched directions ' +
                        direction +
                        ' currentInterp ' +
                        _self.interpValue +
                        ' newInterp ' +
                        interpAmount +
                        ' ' +
                        _self.currentView +
                        ' ' +
                        _self.nextView
                );
            }
            return direction;
        }
        /** Updates the view variables to move the visualization forward
         * (passing the next view)
         * */
        function moveForward() {
            if (_self.nextIndex < _self.lastIndex) {
                //Avoid index out of bounds
                _self.currentIndex = _self.nextIndex;
                _self.nextIndex++;
                _self.timeDirection = 1;
                _self.interpValue = 0;
                selectDatapoint({ value: _self.currentIndex });
            }
        }
        /** Updates the view variables to move the visualization backward
         * (passing the current view)
         * */
        function moveBackward() {
            if (_self.currentIndex > 0) {
                //Avoid index out of bounds
                _self.nextIndex = _self.currentIndex;
                _self.currentIndex--;
                _self.timeDirection = -1;
                _self.interpValue = 1;
                selectDatapoint({ value: _self.currentIndex });
            }
        }

        function minDistancePoint(x, y, pt1_x, pt1_y, pt2_x, pt2_y) {
            var distance = calculateDistance(pt1_x, pt1_y, pt2_x, pt2_y);
            //Two points of the line segment are the same
            if (distance == 0) return [pt1_x, pt1_y, 0];

            var t = ((x - pt1_x) * (pt2_x - pt1_x) + (y - pt1_y) * (pt2_y - pt1_y)) / distance;
            if (t < 0) return [pt1_x, pt1_y, t]; //Point projection goes beyond pt1
            if (t > 1) return [pt2_x, pt2_y, t]; //Point projection goes beyond pt2

            //Otherwise, point projection lies on the line somewhere
            var minX = pt1_x + t * (pt2_x - pt1_x);
            var minY = pt1_y + t * (pt2_y - pt1_y);
            return [minX, minY, t];
        }

        function calculateDistance(x1, y1, x2, y2) {
            var term1 = x1 - x2;
            var term2 = y1 - y2;
            return term1 * term1 + term2 * term2;
        }

        /**Finds the pixel distance from the user's point to the dragged data object's point
         * @return the pixel distance (calculated with the euclidean distance formula)
         * */
        function findPixelDistance(userX, userY, objectX, objectY) {
            var term1 = userX - objectX;
            var term2 = userY - objectY;
            return Math.sqrt(term1 * term1 + term2 * term2);
        }

        this.setState({ x: x, y: y });
    }

    render() {
        return (
            <div className="evalstyle.embedding_wrapper_div">
                <div ref={this.embeddingRef}></div>
                <div
                    className="evalstyle.embedding_control_wrapper_div"
                    style={{ width: this.props.fullWidth ? '60%' : '30%' }}
                >
                    <div className="evalstyle.control_overlay_div" style={{ float: 'left' }}>
                        <Button
                            id="clusterButton"
                            variant="secondary"
                            style={{ display: this.state.clustering != null ? 'none' : 'inline' }}
                            onClick={this.clusterBtnClicked.bind(this)}
                            disabled={this.state.rawdat.length === 0}
                        >
                            Cluster
                        </Button>
                        <span
                            style={{
                                display:
                                    this.state.clustering == null || this.state.clustering_applied ? 'none' : 'inline',
                            }}
                        >
                            Number of clusters:&nbsp;
                        </span>
                        <input
                            type="number"
                            style={{
                                display:
                                    this.state.clustering == null || this.state.clustering_applied ? 'none' : 'inline',
                            }}
                            id="quantity"
                            name="quantity"
                            min="1"
                            max={this.state.rawdat.length}
                            value={this.state.cluster_num}
                            onChange={this.setSelectedClusteringNum.bind(this)}
                        />
                        &nbsp;
                        <Button
                            id="applyClusteringButton"
                            variant="secondary"
                            style={{
                                display:
                                    this.state.clustering == null || this.state.clustering_applied ? 'none' : 'inline',
                            }}
                            onClick={this.applyClusteringClicked.bind(this)}
                        >
                            Apply
                        </Button>
                        <Button
                            id="resetClusteringButton"
                            variant="secondary"
                            style={{ display: !this.state.clustering_applied ? 'none' : 'inline' }}
                            onClick={this.resetClusteringClicked.bind(this)}
                        >
                            Reset
                        </Button>
                        &nbsp;
                        <Button
                            id="unclusterButton"
                            variant="secondary"
                            style={{ display: this.state.clustering == null ? 'none' : 'inline' }}
                            onClick={this.unclusterClicked.bind(this)}
                        >
                            Uncluster
                        </Button>
                    </div>
                    <div className="evalstyle.control_overlay_div" style={{ float: 'left' }}>
                        <DropdownButton
                            as={ButtonGroup}
                            key="color_mode_dropdown"
                            id="color_mode_dropdown"
                            onSelect={this.setColorScaleMode.bind(this)}
                            className="rew_agg_dropdown_button"
                            variant="link"
                            title={'Color Scale: ' + this.state.color_scale_mode}
                        >
                            <Dropdown.Item
                                eventKey="step_reward"
                                active={this.state.color_scale_mode === 'step_reward'}
                            >
                                Step Reward
                            </Dropdown.Item>
                            {this.getStateColorTypes()}
                        </DropdownButton>
                    </div>
                    {this.props.fullWidth && (
                        <div
                            className="evalstyle.control_overlay_div"
                            style={{ position: 'absolute', right: 0, width: '20%' }}
                        >
                            <div>
                                <Button
                                    variant="secondary"
                                    style={{ fontWeight: 'bold', whiteSpace: 'normal', display: 'inline-flex' }}
                                    onClick={this.resizeSVG.bind(this)}
                                >
                                    Load Split View
                                </Button>
                            </div>
                        </div>
                    )}
                    <div
                        className="evalstyle.control_overlay_div"
                        style={{ position: 'absolute', right: 0, top: '45vh', width: '175px' }}
                    >
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '0' }}>
                                State Color Scale: {this.state.color_scale_mode}
                            </p>
                            <div ref={this.colorLegendRef}></div>
                        </div>
                    </div>
                </div>
                <div
                    className="evalstyle.embedding_overlay_div"
                    style={{
                        display:
                            this.props.timeStamp == 0 || this.state.data_timestamp !== this.props.timeStamp
                                ? ''
                                : 'none',
                        width: this.props.fullWidth ? '60%' : '30%',
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
                    <p>
                        <input
                            type="checkbox"
                            id="show_raw_data"
                            checked={this.state.append_time}
                            onChange={this.toggleAppendTime.bind(this)}
                        />{' '}
                        Append time to embedding data to highlight temporal component
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
            </div>
        );
    }
}
