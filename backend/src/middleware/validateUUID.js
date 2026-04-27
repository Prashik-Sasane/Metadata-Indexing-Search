module.exports = function validateUUID(req, res, next) {
  const uuid = req.params.id;

  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidV4Regex.test(uuid)) {
    return res.status(400).json({ error: "Invalid file ID format (must be UUID v4)" });
  }

  next();
};