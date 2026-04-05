const mongoose = require("mongoose");
const {
  DEFAULT_EMPLOYEE,
  DEFAULT_MANAGER,
  REQUEST_STATUSES,
  USER_ROLES,
  VALID_AVAILABILITY_DAYS,
  getMongoUri
} = require("./config");
const { hashPassword } = require("./security");

const globalConnection = global.__scheduloMongo || {
  conn: null,
  promise: null,
  initialized: false
};
global.__scheduloMongo = globalConnection;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "employee"
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      default: "",
      trim: true
    },
    maxHoursPerWeek: {
      type: Number,
      default: 40,
      min: 0,
      max: 168
    },
    skills: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const availabilitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    days: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.every((entry) => VALID_AVAILABILITY_DAYS.includes(entry));
        },
        message: "Invalid availability day"
      }
    },
    timeFrom: {
      type: String,
      default: "09:00"
    },
    timeTo: {
      type: String,
      default: "17:00"
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

const shiftSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: {
      type: String,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    roleLabel: {
      type: String,
      default: "Team Member"
    },
    notes: {
      type: String,
      default: ""
    },
    source: {
      type: String,
      enum: ["manual", "auto", "swap"],
      default: "manual"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

shiftSchema.index({ employee: 1, date: 1 }, { unique: true });

const ptoRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    startDate: {
      type: String,
      required: true
    },
    endDate: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: "pending"
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const swapRequestSchema = new mongoose.Schema(
  {
    fromEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    toEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null
    },
    date: {
      type: String,
      required: true
    },
    roleLabel: {
      type: String,
      default: "Server"
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: "pending"
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    actorName: {
      type: String,
      default: ""
    },
    actorRole: {
      type: String,
      default: ""
    },
    action: {
      type: String,
      required: true
    },
    entityType: {
      type: String,
      required: true
    },
    entityId: {
      type: String,
      default: ""
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Availability = mongoose.models.Availability || mongoose.model("Availability", availabilitySchema);
const Shift = mongoose.models.Shift || mongoose.model("Shift", shiftSchema);
const PtoRequest = mongoose.models.PtoRequest || mongoose.model("PtoRequest", ptoRequestSchema);
const SwapRequest = mongoose.models.SwapRequest || mongoose.model("SwapRequest", swapRequestSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

async function ensureSeedUser(seedConfig, role, maxHoursPerWeek, skills) {
  const existing = await User.findOne({ username: seedConfig.username });
  if (existing) {
    return existing;
  }

  return User.create({
    username: seedConfig.username,
    passwordHash: await hashPassword(seedConfig.password),
    role,
    name: seedConfig.name,
    email: seedConfig.email,
    maxHoursPerWeek,
    skills
  });
}

async function seedInitialData() {
  const manager = await ensureSeedUser(
    DEFAULT_MANAGER,
    "manager",
    45,
    ["Scheduling", "Leadership"]
  );

  const employee = await ensureSeedUser(
    DEFAULT_EMPLOYEE,
    "employee",
    40,
    ["Customer Service", "POS"]
  );

  const existingAvailability = await Availability.findOne({ user: employee._id });
  if (!existingAvailability) {
    await Availability.create({
      user: employee._id,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      timeFrom: "09:00",
      timeTo: "17:00",
      updatedBy: manager._id
    });
  }
}

async function connectToDatabase() {
  if (globalConnection.conn) {
    return globalConnection.conn;
  }

  if (!globalConnection.promise) {
    const mongoUri = getMongoUri();
    if (!mongoUri) {
      throw new Error("MONGO_URI is not configured");
    }

    globalConnection.promise = mongoose.connect(mongoUri, {
      bufferCommands: false
    });
  }

  globalConnection.conn = await globalConnection.promise;

  if (!globalConnection.initialized) {
    await seedInitialData();
    globalConnection.initialized = true;
  }

  return globalConnection.conn;
}

module.exports = {
  AuditLog,
  Availability,
  PtoRequest,
  Shift,
  SwapRequest,
  User,
  connectToDatabase
};
