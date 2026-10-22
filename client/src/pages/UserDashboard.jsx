import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  Ticket,
  Clock,
  MapPin,
  Users,
  IndianRupee,
  Calendar,
  CheckCircle,
  XCircle,
  Loader,
  ArrowRight,
  Filter,
  Download,
  RefreshCcw,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import {
  isTicketValid,
  getTicketExpiryDate,
  getTicketIssueDate,
  formatTicketDateTime,
  getTicketStatus,
  isTicketConsumed,
  formatViaStation,
} from "../utils/ticketUtils";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [filter, setFilter] = useState("all"); // all, active, expired

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setTickets([]);
      setLoadingTickets(false);
      return;
    }
    fetchTickets(userId);
  }, [userId, isLoaded]);

  const fetchTickets = async (currentUserId = userId) => {
    if (!currentUserId) {
      setTickets([]);
      setLoadingTickets(false);
      return;
    }
    setLoadingTickets(true);
    try {
      const response = await fetch(`http://localhost:5000/api/tickets?userId=${encodeURIComponent(currentUserId)}`, {
        headers: {
          "x-user-id": currentUserId,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTickets(Array.isArray(data) ? data : []);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const getFilteredTickets = () => {
    if (filter === "active") {
      return tickets.filter((t) => isTicketValid(t));
    } else if (filter === "expired") {
      return tickets.filter((t) => !isTicketValid(t));
    }
    return tickets;
  };

  const activeCount = tickets.filter((t) => isTicketValid(t)).length;
  const expiredCount = tickets.filter((t) => !isTicketValid(t)).length;

  const filteredTickets = getFilteredTickets();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                My Tickets
              </h1>
              <p className="text-gray-600 text-lg">
                View and manage your purchased tickets
              </p>
            </div>
            <button
              onClick={fetchTickets}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setFilter("all")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              filter === "all"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            All Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              filter === "active"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter("expired")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              filter === "expired"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Expired ({expiredCount})
          </button>
        </div>

        {/* Tickets Grid */}
        {loadingTickets ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading tickets...</p>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-md border border-gray-200">
            <Ticket className="w-20 h-20 mx-auto text-gray-300 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {filter === "all"
                ? "No tickets found"
                : filter === "active"
                  ? "No active tickets"
                  : "No expired tickets"}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === "all"
                ? "You haven't purchased any tickets yet"
                : filter === "active"
                  ? "All your tickets have expired"
                  : "You don't have any expired tickets"}
            </p>
            <button
              onClick={() => navigate("/ticketing")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all"
            >
              Book a Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket, index) => {
              const valid = isTicketValid(ticket);
              const status = getTicketStatus(ticket);
              const issueDate = getTicketIssueDate(ticket);
              const expiryDate = getTicketExpiryDate(ticket);
              return (
                <div
                  key={ticket.ticket_id || index}
                  onClick={() => navigate("/digital-ticket", { state: ticket })}
                  className={`bg-white rounded-xl shadow-md border-2 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                    valid
                      ? "border-green-200 hover:border-green-400"
                      : "border-gray-200 hover:border-gray-400 opacity-75"
                  }`}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-3 rounded-lg ${
                            valid
                              ? "bg-green-100"
                              : status === "Used"
                                ? "bg-amber-100"
                                : "bg-gray-100"
                          }`}
                        >
                          <Ticket
                            className={`w-6 h-6 ${
                              valid
                                ? "text-green-600"
                                : status === "Used"
                                  ? "text-amber-600"
                                  : "text-gray-500"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {ticket.source} → {ticket.destination}
                            </h3>
                            {ticket.source_type === "counter" && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded uppercase">
                                Counter Ticket
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                            <span>{ticket.class} • {ticket.ticket_type || ticket.ticketType}</span>
                            {formatViaStation(ticket.via) && formatViaStation(ticket.via) !== "Direct" && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-semibold text-xs rounded border border-blue-200">
                                Via: {formatViaStation(ticket.via)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-600 mb-1">
                          ₹{ticket.fare}
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            valid
                              ? "bg-green-100 text-green-700"
                              : status === "Used"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {valid ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </>
                          ) : status === "Used" ? (
                            <>
                              <XCircle className="w-3 h-3" />
                              Used
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Expired
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ticket Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Passengers</p>
                          <p className="font-semibold text-gray-900">
                            {ticket.passengers}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Issued</p>
                          <p className="font-semibold text-gray-900 text-sm">
                            {formatTicketDateTime(issueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Valid Until</p>
                          <p className="font-semibold text-gray-900 text-sm">
                            {formatTicketDateTime(expiryDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Ticket ID</p>
                          <p className="font-mono text-xs text-gray-900 font-semibold">
                            {ticket.ticket_id.substring(0, 12)}...
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* View Ticket Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                      <button className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                        View Full Ticket
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        {filteredTickets.length > 0 && (
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => navigate("/ticketing")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all"
            >
              Book Another Ticket
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserDashboard;
