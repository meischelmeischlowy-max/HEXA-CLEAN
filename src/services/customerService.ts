import { customerRepository } from "@/repositories/customerRepository";

type CustomerTypeInput = "PRIVATE" | "COMPANY";

type CreateOrFindCustomerInput = {
  type?: CustomerTypeInput;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  notes?: string;
};

function cleanText(value?: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

function cleanEmail(value?: string) {
  const cleaned = value?.trim().toLowerCase();
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

export const customerService = {
  async createOrFindCustomer(input: CreateOrFindCustomerInput) {
    const email = cleanEmail(input.email);
    const phone = cleanText(input.phone);

    if (!email && !phone) {
      throw new Error("Customer email or phone is required");
    }

    if (email) {
      const existingCustomer = await customerRepository.findByEmail(email);

      if (existingCustomer) {
        return {
          customer: existingCustomer,
          wasCreated: false,
          matchedBy: "email",
        };
      }
    }

    if (phone) {
      const existingCustomer = await customerRepository.findByPhone(phone);

      if (existingCustomer) {
        return {
          customer: existingCustomer,
          wasCreated: false,
          matchedBy: "phone",
        };
      }
    }

    const customer = await customerRepository.create({
      type: input.type ?? "PRIVATE",
      firstName: cleanText(input.firstName),
      lastName: cleanText(input.lastName),
      companyName: cleanText(input.companyName),
      email,
      phone,
      street: cleanText(input.street),
      zipCode: cleanText(input.zipCode),
      city: cleanText(input.city),
      country: cleanText(input.country) ?? "CH",
      notes: cleanText(input.notes),
    });

    return {
      customer,
      wasCreated: true,
      matchedBy: null,
    };
  },

  async getCustomerById(id: string) {
    const customer = await customerRepository.findById(id);

    if (!customer) {
      throw new Error("Customer not found");
    }

    return customer;
  },
};