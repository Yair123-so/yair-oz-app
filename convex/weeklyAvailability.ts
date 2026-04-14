import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("weeklyAvailability").collect();
  },
});

export const listByDay = query({
  args: {
    dayOfWeek: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("weeklyAvailability")
      .withIndex("by_day", (q) => q.eq("dayOfWeek", args.dayOfWeek))
      .collect();
  },
});

export const setSlot = mutation({
  args: {
    dayOfWeek: v.string(),
    time: v.string(),
    isOpen: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("weeklyAvailability")
      .withIndex("by_day_time", (q) =>
        q.eq("dayOfWeek", args.dayOfWeek).eq("time", args.time)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isOpen: args.isOpen,
      });
      return existing._id;
    }

    return await ctx.db.insert("weeklyAvailability", {
      dayOfWeek: args.dayOfWeek,
      time: args.time,
      isOpen: args.isOpen,
    });
  },
});