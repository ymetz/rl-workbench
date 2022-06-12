const environments_schema = [
    {
        dataField: 'id',
        text: 'environment ID',
    },
    {
        dataField: 'env_name',
        text: 'Name',
    },{
        dataField: 'registered',
        text: 'Registered',
        formatter: 'date'
    },
    {
        dataField: 'env_path',
        text: 'Path',
    },{
        dataField: 'description',
        text: 'Description',
    },{
        dataField: 'tags',
        text: 'Tags',
        formatter: 'tag'
    },
    {
        dataField: 'type',
        text: 'Type',
    },
    {
        dataField: 'has_state_loading',
        text: 'Has State Loading',
    }
];

const project_schema = 
    [{
        dataField: 'id',
        text: 'Project ID',
    },{
        dataField: 'project_name',
        text: 'Name',
    }, {
        dataField: 'created_timestamp',
        text: 'Created',
        formatter: 'date'
    }, {
        dataField: 'project_path',
        text: 'Path'
    }, {
        dataField: 'project_description',
        text: 'Description',
    }, {
        dataField: 'project_tags',
        text: 'Tags',
        formatter: "tag",
    }, {
        dataField: 'project_environments',
        text: 'Environments',
        formatter: "list"
    }, {
        dataField: 'project_datasets',
        text: 'Datasets',
        formatter: "list",
    }, {
        dataField: 'project_experiments',
        text: 'Experiments',
        formatter: 'list'
    }
];

const experiments_schema = [{
    dataField: 'id',
    text: 'Experiment ID'
}, {
    dataField: 'exp_name',
    text: 'Experiment Name'
}, {
    dataField: 'environment',
    text: 'Environment Name'
}, {
    dataField: 'framework',
    text: 'Framework'
},
{
    dataField: 'num_timesteps',
    text: 'Training Steps'
},
{
    dataField: 'path',
    text: 'Exp. Path'
},
{
    dataField: 'run_timestamp',
    text: 'Started running',
    formatter:  'date',
}, {
    dataField: 'exp_tags',
    text: 'Tags',
    formatter: "tag",
}, {
    dataField: 'exp_comment',
    text: 'Comment',
}, {
    dataField: 'status',
    text: 'Status',
    formatter: "tag"
}]



export { project_schema, environments_schema, experiments_schema };