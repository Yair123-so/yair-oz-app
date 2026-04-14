import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("availability")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

export const setAvailability = mutation({
  args: {
    date: v.string(),
    time: v.string(),
    isOpen: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("availability")
      .withIndex("by_date_time", (q) =>
        q.eq("date", args.date).eq("time", args.time)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { isOpen: args.isOpen });
      return existing._id;
    }

    return await ctx.db.insert("availability", {
      date: args.date,
      time: args.time,
      isOpen: args.isOpen,
    });
  },
});

export const openAllForDate = mutation({
  args: {
    date: v.string(),
    times: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    for (const time of args.times) {
      const existing = await ctx.db
        .query("availability")
        .withIndex("by_date_time", (q) =>
          q.eq("date", args.date).eq("time", time)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { isOpen: true });
      } else {
        await ctx.db.insert("availability", {
          date: args.date,
          time,
          isOpen: true,
        });
      }
    }

    return { ok: true };
  },
});

export const closeAllForDate = mutation({
  args: {
    date: v.string(),
    times: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    for (const time of args.times) {
      const existing = await ctx.db
        .query("availability")
        .withIndex("by_date_time", (q) =>
          q.eq("date", args.date).eq("time", time)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { isOpen: false });
      } else {
        await ctx.db.insert("availability", {
          date: args.date,
          time,
          isOpen: false,
        });
      }
    }

    return { ok: true };
  },
});

export const resetAllForDate = mutation({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("availability")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    for (const item of all) {
      await ctx.db.delete(item._id);
    }

    return { ok: true };
  },
});

export const copyDateToDate = mutation({
  args: {
    sourceDate: v.string(),
    targetDate: v.string(),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db
      .query("availability")
      .withIndex("by_date", (q) => q.eq("date", args.sourceDate))
      .collect();

    const target = await ctx.db
      .query("availability")
      .withIndex("by_date", (q) => q.eq("date", args.targetDate))
      .collect();

    for (const item of target) {
      await ctx.db.delete(item._id);
    }

    for (const item of source) {
      await ctx.db.insert("availability", {
        date: args.targetDate,
        time: item.time,
        isOpen: item.isOpen,
      });
    }

    return { ok: true };
  },
});
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("availability").collect();
  },
});