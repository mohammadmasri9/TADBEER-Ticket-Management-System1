import TicketService from "../services/Ticket.service";
import { Request, Response } from "express";

export default {
  async getAll(req: Request, res: Response) {
    const tickets = await TicketService.getAll();
    res.json(tickets);
  },

  async create(req: Request, res: Response) {
    const ticket = await TicketService.create(req.body);
    res.json(ticket);
  },

  async getOne(req: Request, res: Response) {
    const ticket = await TicketService.getOne(req.params.id);
    res.json(ticket);
  }
};
