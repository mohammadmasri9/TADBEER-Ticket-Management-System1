import Ticket from "../models/Ticket.model";

export default {
  getAll() {
    return Ticket.find();
  },

  create(data: any) {
    return Ticket.create(data);
  },

  getOne(id: string) {
    return Ticket.findById(id);
  }
};
