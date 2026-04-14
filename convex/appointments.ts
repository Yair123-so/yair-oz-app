import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

export const listByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("appointments").collect();
  },
});

export const listByPhone = query({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();
  },
});

export const create = mutation({
  args: {
    fullName: v.string(),
    phone: v.string(),
    service: v.string(),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slot = await ctx.db
      .query("availability")
      .withIndex("by_date_time", (q) =>
        q.eq("date", args.date).eq("time", args.time)
      )
      .first();

    if (!slot || !slot.isOpen) {
      throw new ConvexError("SLOT_NOT_OPEN");
    }

    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_date_time", (q) =>
        q.eq("date", args.date).eq("time", args.time)
      )
      .first();

    if (existing && existing.status === "booked") {
      throw new ConvexError("ALREADY_BOOKED");
    }

    const byPhone = await ctx.db
      .query("appointments")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();

    const activeAppointments = byPhone.filter(
      (item) => item.status === "booked"
    );

    if (activeAppointments.length >= 4) {
      throw new ConvexError("MAX_APPOINTMENTS");
    }

    return await ctx.db.insert("appointments", {
      fullName: args.fullName,
      phone: args.phone,
      service: args.service,
      date: args.date,
      time: args.time,
      notes: args.notes,
      status: "booked",
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});