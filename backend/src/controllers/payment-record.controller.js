export const createPaymentRecord = async (req, res, next) => {
  res.send("Create a new payment record");
};

export const getAllPaymentRecords = async (req, res, next) => {
  res.send("Get all payment records");
};

export const getPaymentRecordById = async (req, res, next) => {
  const { id } = req.params;
  res.send(`Get payment record with ID: ${id}`);
};

export const updatePaymentRecordById = async (req, res, next) => {
  const { id } = req.params;
  res.send(`Update payment record with ID: ${id}`);
};

export const deletePaymentRecordById = async (req, res, next) => {
  const { id } = req.params;
  res.send(`Delete payment record with ID: ${id}`);
};
