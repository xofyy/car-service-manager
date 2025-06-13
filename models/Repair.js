const mongoose = require('mongoose');

// Repair Schema
const repairSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    vehicleBrand: { type: String, required: true },
    vehicleModel: { type: String, required: true },
    licensePlate: { type: String, required: true },
    repairDescription: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    estimatedCost: { type: Number, required: true },
    actualCost: { type: Number },
    assignedTechnician: { type: String },
    parts: [{ type: String }],
    notes: [{ type: String }],
    createdDate: { type: Date, default: Date.now },
    updatedDate: { type: Date, default: Date.now },
    completedDate: { type: Date },
    images: [{
        url: String,
        filename: String
    }],
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

const Repair = mongoose.model('Repair', repairSchema);

module.exports = Repair; 