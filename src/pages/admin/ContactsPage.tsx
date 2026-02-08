import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Eye, 
  Trash2, 
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  FileText,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
  quote_count: number;
  total_revenue: number;
}

interface ContactQuote {
  id: number;
  reference_number: string;
  model_name: string;
  base_price: number;
  options_total: number;
  total_price: number;
  status: string;
  created_at: string;
  valid_until: string;
}

interface ContactDetails extends Contact {
  quotes: ContactQuote[];
  total_quotes: number;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState<ContactDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadContacts();
  }, []);

  // Handle ?contact= parameter to auto-open a specific contact
  useEffect(() => {
    const contactIdParam = searchParams.get('contact');
    if (contactIdParam && contacts.length > 0) {
      const contact = contacts.find(c => c.id === parseInt(contactIdParam));
      if (contact) {
        loadContactDetails(contact);
      }
    }
  }, [searchParams, contacts]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, statusFilter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const result = await api.getContacts();
      setContacts(Array.isArray(result) ? result : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    setFilteredContacts(filtered);
  };

  const loadContactDetails = async (contact: Contact) => {
    setDetailsLoading(true);
    try {
      const result = await api.getContact(contact.id);
      setSelectedContact(result);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.updateContact({ id, status: status as any });
      toast({ title: 'Succès', description: 'Statut mis à jour' });
      loadContacts();
      
      if (selectedContact?.id === id) {
        setSelectedContact({ ...selectedContact, status });
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const deleteContact = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ? Cette action est irréversible.')) return;
    
    try {
      await api.deleteContact(id);
      toast({ title: 'Succès', description: 'Contact supprimé' });
      loadContacts();
      setSelectedContact(null);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MU', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(price) + ' Rs';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      read: 'bg-gray-100 text-gray-800',
      replied: 'bg-green-100 text-green-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      new: 'Nouveau',
      read: 'Lu',
      replied: 'Répondu',
      archived: 'Archivé',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  const getQuoteStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      completed: 'Terminé',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  const getStatusCount = (status: string) => {
    return contacts.filter(c => c.status === status).length;
  };

  // Calculate profit (difference between total_price and base_price + options_total would be markup, but here we show options as profit margin)
  const calculateProfit = (quote: ContactQuote) => {
    // Assuming VAT is 15% and profit is calculated from the margin
    // For simplicity, showing the options_total as the "added value"
    return quote.options_total;
  };

  // Calculate HT from TTC (assuming 15% VAT)
  const calculateHT = (ttc: number) => {
    return Math.round(ttc / 1.15);
  };

  const openQuoteDetails = (quoteId: number) => {
    // Navigate to quotes page with the quote selected
    navigate(`/admin/quotes?quote=${quoteId}`);
    setSelectedContact(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Contacts</h1>
          <p className="text-gray-500 mt-1">{contacts.length} contacts au total</p>
        </div>
        <Button onClick={loadContacts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-blue-300" onClick={() => setStatusFilter('new')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{getStatusCount('new')}</p>
            <p className="text-sm text-gray-500">Nouveaux</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-gray-300" onClick={() => setStatusFilter('read')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{getStatusCount('read')}</p>
            <p className="text-sm text-gray-500">Lus</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-300" onClick={() => setStatusFilter('replied')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{getStatusCount('replied')}</p>
            <p className="text-sm text-gray-500">Répondus</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-yellow-300" onClick={() => setStatusFilter('archived')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{getStatusCount('archived')}</p>
            <p className="text-sm text-gray-500">Archivés</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="new">Nouveau</SelectItem>
                <SelectItem value="read">Lu</SelectItem>
                <SelectItem value="replied">Répondu</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Nom</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Devis</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">CA Total</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Créé le</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm">{contact.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-600">{contact.email}</p>
                        <p className="text-xs text-gray-500">{contact.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <FileText className="h-4 w-4 text-gray-400" />
                        {contact.quote_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-sm">
                      {formatPrice(contact.total_revenue || 0)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(contact.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(contact.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => loadContactDetails(contact)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => deleteContact(contact.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredContacts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun contact trouvé</p>
              {statusFilter !== 'all' && (
                <Button variant="link" onClick={() => setStatusFilter('all')} className="mt-2">
                  Voir tous les contacts
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Details Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Détails du Contact
            </DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : selectedContact && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Informations</h4>
                  {getStatusBadge(selectedContact.status)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Nom</p>
                    <p className="font-medium">{selectedContact.name}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a href={`mailto:${selectedContact.email}`} className="font-medium hover:text-orange-600">
                        {selectedContact.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <a href={`tel:${selectedContact.phone}`} className="font-medium hover:text-orange-600">
                        {selectedContact.phone}
                      </a>
                    </div>
                  </div>
                  {selectedContact.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">Adresse</p>
                        <p className="font-medium">{selectedContact.address}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-gray-500 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Créé le: {formatDateTime(selectedContact.created_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Modifié le: {formatDateTime(selectedContact.updated_at)}
                  </div>
                </div>
              </div>

              {/* Quotes List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">
                    Historique des Devis ({selectedContact.total_quotes})
                  </h4>
                  <div className="text-sm text-gray-500">
                    CA Total: <span className="font-bold text-orange-600">{formatPrice(selectedContact.total_revenue)}</span>
                  </div>
                </div>
                
                {selectedContact.quotes && selectedContact.quotes.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Référence</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">Montant HT</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">Options</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">Total TTC</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-500">Statut</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedContact.quotes.map((quote) => (
                          <tr key={quote.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-mono text-blue-600">{quote.reference_number}</span>
                              <p className="text-xs text-gray-500">{quote.model_name}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatDate(quote.created_at)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatPrice(calculateHT(quote.total_price))}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600">
                              +{formatPrice(quote.options_total)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {formatPrice(quote.total_price)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {getQuoteStatusBadge(quote.status)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => openQuoteDetails(quote.id)}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun devis pour ce contact</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Select 
                  value={selectedContact.status} 
                  onValueChange={(value) => updateStatus(selectedContact.id, value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="read">Lu</SelectItem>
                    <SelectItem value="replied">Répondu</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 ml-auto"
                  onClick={() => deleteContact(selectedContact.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
