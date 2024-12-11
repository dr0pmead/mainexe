const mongoose = require('mongoose');

const DivisionSchema = new mongoose.Schema({
    name: { type: String, required: true },
});

const DepartmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    divisions: [DivisionSchema],
});

module.exports = mongoose.model('Department', DepartmentSchema);
