(() => {
  const storageKey = "fintrack-bills";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const $ = (id) => document.getElementById(id);

  function localDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function dateAfter(days) {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return localDate(date);
  }

  const sampleBills = [
    {
      id: "bill-1",
      name: "Electricity",
      amount: 1850,
      category: "Utilities",
      dueDate: dateAfter(2),
      frequency: "monthly",
      autoPay: false,
      paid: false,
    },
    {
      id: "bill-2",
      name: "Home internet",
      amount: 999,
      category: "Internet",
      dueDate: dateAfter(5),
      frequency: "monthly",
      autoPay: true,
      paid: false,
    },
    {
      id: "bill-3",
      name: "Apartment rent",
      amount: 18000,
      category: "Housing",
      dueDate: dateAfter(12),
      frequency: "monthly",
      autoPay: false,
      paid: false,
    },
    {
      id: "bill-4",
      name: "Music subscription",
      amount: 119,
      category: "Entertainment",
      dueDate: dateAfter(18),
      frequency: "monthly",
      autoPay: true,
      paid: false,
    },
    {
      id: "bill-5",
      name: "Car insurance",
      amount: 3200,
      category: "Insurance",
      dueDate: dateAfter(26),
      frequency: "yearly",
      autoPay: false,
      paid: false,
    },
  ];

  let bills;
  try {
    bills = JSON.parse(localStorage.getItem(storageKey)) || sampleBills;
  } catch {
    bills = sampleBills;
  }

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  const daysUntil = (value) =>
    Math.ceil((new Date(`${value}T00:00:00`) - today) / 86400000);
  const displayDate = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  const escapeHtml = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  const save = () => localStorage.setItem(storageKey, JSON.stringify(bills));

  function notify(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.dataset.visible = "true";
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      toast.dataset.visible = "false";
    }, 2200);
  }

  function monthlyAmount(bill) {
    const amount = Number(bill.amount);
    if (bill.frequency === "weekly") return amount * 4.33;
    if (bill.frequency === "yearly") return amount / 12;
    if (bill.frequency === "one-time") return 0;
    return amount;
  }

  function advanceRecurringDate(bill) {
    const date = new Date(`${bill.dueDate}T00:00:00`);
    if (bill.frequency === "weekly") date.setDate(date.getDate() + 7);
    else if (bill.frequency === "yearly")
      date.setFullYear(date.getFullYear() + 1);
    else date.setMonth(date.getMonth() + 1);
    bill.dueDate = localDate(date);
  }

  function renderUpcoming(activeBills) {
    const upcoming = activeBills
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 3);
    const list = $("upcomingList");
    list
      .querySelectorAll("[data-upcoming-item]")
      .forEach((item) => item.remove());
    if (upcoming.length === 0) {
      $("upcomingEmpty").hidden = false;
      return;
    }
    $("upcomingEmpty").hidden = true;

    for (const bill of upcoming) {
      const item =
        $("upcomingTemplate").content.firstElementChild.cloneNode(true);
      item.dataset.upcomingItem = "true";
      const days = daysUntil(bill.dueDate);
      const due =
        days < 0
          ? `${Math.abs(days)} days overdue`
          : days === 0
            ? "Due today"
            : days === 1
              ? "Due tomorrow"
              : `In ${days} days`;
      item.querySelector(".upcoming-name").textContent = bill.name;
      item.querySelector(".upcoming-date").textContent = displayDate(
        bill.dueDate,
      );
      item.querySelector(".upcoming-due").textContent = `· ${due}`;
      item.querySelector(".upcoming-due").dataset.urgent = String(days <= 3);
      item.querySelector(".upcoming-amount").textContent = money(bill.amount);
      list.append(item);
    }
  }

  function renderBills() {
    const query = $("search").value.trim().toLocaleLowerCase();
    const filter = $("filter").value;
    const shown = bills
      .filter(
        (bill) =>
          (!query ||
            bill.name.toLocaleLowerCase().includes(query) ||
            bill.category.toLocaleLowerCase().includes(query)) &&
          (filter === "all" ||
            (filter === "unpaid" && !bill.paid) ||
            (filter === "paid" && bill.paid) ||
            (filter === "recurring" && bill.frequency !== "one-time")),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    $("listCount").textContent =
      `${shown.length} payment${shown.length === 1 ? "" : "s"} saved`;
    $("emptyState").hidden = shown.length !== 0;
    $("billList").replaceChildren();

    for (const bill of shown) {
      const row = $("billTemplate").content.firstElementChild.cloneNode(true);
      const days = daysUntil(bill.dueDate);
      const state = bill.paid
        ? "Paid"
        : days < 0
          ? "Overdue"
          : days === 0
            ? "Due today"
            : days <= 3
              ? "Due soon"
              : "Upcoming";
      row.dataset.id = bill.id;
      row.querySelector(".bill-name").textContent = bill.name;
      row.querySelector(".bill-method").textContent = bill.autoPay
        ? "Auto-pay"
        : "Manual payment";
      row
        .querySelector(".bill-category")
        .prepend(document.createTextNode(bill.category));
      row.querySelector(".bill-due-date").textContent = displayDate(
        bill.dueDate,
      );
      const badge = row.querySelector(".bill-status");
      badge.textContent = state;
      badge.dataset.state = bill.paid
        ? "paid"
        : days < 0
          ? "overdue"
          : days <= 3
            ? "urgent"
            : "upcoming";
      row
        .querySelector(".bill-frequency")
        .prepend(document.createTextNode(bill.frequency.replace("-", " ")));
      row.querySelector(".bill-amount").textContent = money(bill.amount);
      row.querySelector(".mark-paid").dataset.id = bill.id;
      row.querySelector(".mark-paid").hidden = bill.paid;
      row.querySelector(".paid-label").hidden = !bill.paid;
      row.querySelector(".edit-bill").dataset.id = bill.id;
      row
        .querySelector(".edit-bill")
        .setAttribute("aria-label", `Edit ${bill.name}`);
      row.querySelector(".delete-bill").dataset.id = bill.id;
      row
        .querySelector(".delete-bill")
        .setAttribute("aria-label", `Delete ${bill.name}`);
      $("billList").append(row);
    }
  }

  function render() {
    const active = bills.filter((bill) => !bill.paid);
    const dueThisMonth = active.filter((bill) => {
      const due = new Date(`${bill.dueDate}T00:00:00`);
      return (
        due.getMonth() === today.getMonth() &&
        due.getFullYear() === today.getFullYear()
      );
    });
    const dueSoon = active.filter(
      (bill) => daysUntil(bill.dueDate) >= 0 && daysUntil(bill.dueDate) <= 7,
    );
    const recurring = bills.filter((bill) => bill.frequency !== "one-time");
    const monthlyEstimate = recurring.reduce(
      (sum, bill) => sum + monthlyAmount(bill),
      0,
    );
    $("monthTotal").textContent = money(
      dueThisMonth.reduce((sum, bill) => sum + Number(bill.amount), 0),
    );
    $("monthCount").textContent =
      `${dueThisMonth.length} unpaid ${dueThisMonth.length === 1 ? "payment" : "payments"}`;
    $("soonTotal").textContent = money(
      dueSoon.reduce((sum, bill) => sum + Number(bill.amount), 0),
    );
    $("soonCount").textContent =
      `${dueSoon.length} ${dueSoon.length === 1 ? "payment" : "payments"} due soon`;
    $("recurringTotal").textContent = money(monthlyEstimate);
    $("recurringCount").textContent =
      `${recurring.length} active ${recurring.length === 1 ? "subscription" : "subscriptions"}`;
    $("forecastTotal").textContent = money(monthlyEstimate);
    $("annualTotal").textContent = money(monthlyEstimate * 12);

    const urgent = active.filter((bill) => daysUntil(bill.dueDate) <= 3);
    $("alertBanner").hidden = urgent.length === 0;
    $("alertText").textContent = urgent.length
      ? `${urgent.length} payment${urgent.length === 1 ? "" : "s"} overdue or due within 3 days.`
      : "";
    renderUpcoming(active);
    renderBills();
  }

  function openModal(bill) {
    $("billForm").reset();
    $("billId").value = bill?.id || "";
    $("modalTitle").textContent = bill ? "Edit payment" : "Add a payment";
    if (bill) {
      $("name").value = bill.name;
      $("amount").value = bill.amount;
      $("dueDate").value = bill.dueDate;
      $("category").value = bill.category;
      $("frequency").value = bill.frequency;
      $("autoPay").checked = bill.autoPay;
    }
    $("modal").hidden = false;
    $("name").focus();
  }
  function closeModal() {
    $("modal").hidden = true;
  }

  $("todayText").textContent = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  $("addBill").addEventListener("click", () => openModal());
  $("closeModal").addEventListener("click", closeModal);
  $("cancelModal").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (event) => {
    if (event.target === $("modal")) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
  $("search").addEventListener("input", renderBills);
  $("filter").addEventListener("change", renderBills);

  $("billForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = $("billId").value;
    const bill = {
      id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      name: $("name").value.trim(),
      amount: Number($("amount").value),
      category: $("category").value,
      dueDate: $("dueDate").value,
      frequency: $("frequency").value,
      autoPay: $("autoPay").checked,
      paid: false,
    };
    if (id) {
      bill.paid = bills.find((item) => item.id === id)?.paid || false;
      bills = bills.map((item) => (item.id === id ? bill : item));
      notify("Payment updated");
    } else {
      bills.push(bill);
      notify("Payment added");
    }
    save();
    closeModal();
    render();
  });

  $("billList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action][data-id]");
    if (!button) return;
    const bill = bills.find((item) => item.id === button.dataset.id);
    if (!bill) return;
    if (button.dataset.action === "paid") {
      if (bill.frequency === "one-time") {
        bill.paid = true;
        notify("Payment marked paid");
      } else {
        advanceRecurringDate(bill);
        notify("Paid — next due date scheduled");
      }
    } else if (button.dataset.action === "edit") {
      openModal(bill);
      return;
    } else if (button.dataset.action === "delete") {
      bills = bills.filter((item) => item.id !== bill.id);
      notify("Payment deleted");
    }
    save();
    render();
  });

  render();
})();
