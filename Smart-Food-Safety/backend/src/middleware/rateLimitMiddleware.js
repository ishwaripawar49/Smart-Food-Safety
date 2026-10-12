const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 30;
  const message = options.message || "Too many requests. Please try again later.";

  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(ip);
      }
    }
  }, Math.min(windowMs, 60000));

  return (req, res, next) => {
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      hits.set(ip, record);
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((record.startTime + windowMs - now) / 1000)
      });
    }

    next();
  };
};

module.exports = rateLimit;
