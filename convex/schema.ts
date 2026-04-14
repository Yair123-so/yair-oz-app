import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  appointments: defineTable({
    fullName: v.string(),
    phone: v.string(),
    service: v.string(),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
    status: v.string(),
  })
    .index("by_date", ["date"])
    .index("by_date_time", ["date", "time"])
    .index("by_phone", ["phone"]),

  availability: defineTable({
    date: v.string(),
    time: v.string(),
    isOpen: v.boolean(),
  })
    .index("by_date", ["date"])
    .index("by_date_time", ["date", "time"]),

  weeklyAvailability: defineTable({
    dayOfWeek: v.string(),
    time: v.string(),
    isOpen: v.boolean(),
  })
    .index("by_day", ["dayOfWeek"])
    .index("by_day_time", ["dayOfWeek", "time"]),
});