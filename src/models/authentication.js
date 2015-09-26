import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const authenticationSchema = new Schema({
  'user': { 'type': Schema.Types.ObjectId, 'ref': 'User' },
  'email': { 'type': String, 'max': 254, 'required': true, 'unique': true },
  'hash': { 'type': String, 'required': true },
  'salt': { 'type': String, 'required': true },
  'validated': { 'type': Boolean, 'default': false }
}, {
  'minimize': false
});

export default mongoose.model('Authentication', authenticationSchema);
